import { env, type SqlPreparedStatement } from '@/db/runtime';
import type { AuthUser } from '@/db/auth';
import { venue } from '@/lib/venue';

type ReservationStatus = 'pending' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled';
type ReservationActivityStatus = 'confirmed' | 'delayed' | 'cancelled';

export type ReservationRecord = {
  id: string;
  user_id: string;
  email_snapshot: string;
  display_name: string;
  organization_id: string;
  place_id: string;
  activity_title: string;
  slot_start_at: string;
  slot_end_at: string;
  status: ReservationStatus;
  contact_expires_at: string;
  activity_status: ReservationActivityStatus;
  change_message: string;
  arrival_time: string;
  attendee_note: string;
  last_transition_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExhibitorReservationRecord = Pick<ReservationRecord, 'id' | 'email_snapshot' | 'display_name' | 'activity_title' | 'slot_start_at' | 'slot_end_at' | 'status' | 'arrival_time' | 'attendee_note' | 'created_at' | 'updated_at'>;
export type VisitorReservationRecord = Pick<ReservationRecord, 'id' | 'activity_title' | 'slot_start_at' | 'status' | 'activity_status' | 'change_message' | 'arrival_time' | 'attendee_note'>;

export type ReservationActivitySync = {
  organizationId: string;
  placeId: string;
  previousStart: string;
  title: string;
  start: string;
  duration: number;
  status: ReservationActivityStatus;
  actorId: string;
};

const tenantId = 'tenant-thousand-hackathon';
const contactRetentionMs = 7 * 24 * 60 * 60 * 1000;
let initialized = false;

function changeCount(result: { meta?: unknown } | undefined) {
  return Number(((result?.meta ?? {}) as { changes?: number }).changes ?? 0);
}

function activityWindow(start: string, duration: number) {
  const hasTimezone = /[zZ]|[+-]\d\d:\d\d$/.test(start);
  const needsSeconds = /T\d\d:\d\d$/.test(start);
  const parsedStart = new Date(hasTimezone ? start : `${start}${needsSeconds ? ':00' : ''}+08:00`);
  if (Number.isNaN(parsedStart.getTime()) || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('RESERVATION_TIME_INVALID');
  }
  const endTime = parsedStart.getTime() + duration * 60_000;
  return {
    slotEndAt: new Date(endTime).toISOString(),
    contactExpiresAt: new Date(endTime + contactRetentionMs).toISOString(),
  };
}

function shanghaiClockMinutes(value: string) {
  if (!/[zZ]|[+-]\d\d:\d\d$/.test(value)) {
    const localTime = value.match(/T(\d{2}):(\d{2})/);
    return localTime ? Number(localTime[1]) * 60 + Number(localTime[2]) : Number.NaN;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return Number.NaN;
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed)) parts[part.type] = part.value;
  return Number(parts.hour) * 60 + Number(parts.minute);
}

async function ensureReservationTable() {
  if (initialized) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_reservations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      email_snapshot TEXT NOT NULL,
      display_name TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      place_id TEXT NOT NULL,
      activity_title TEXT NOT NULL,
      slot_start_at TEXT NOT NULL,
      slot_end_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      consent_version TEXT NOT NULL,
      contact_expires_at TEXT NOT NULL,
      activity_status TEXT NOT NULL DEFAULT 'confirmed',
      change_message TEXT NOT NULL DEFAULT '',
      arrival_time TEXT NOT NULL DEFAULT '',
      attendee_note TEXT NOT NULL DEFAULT '',
      last_transition_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_app_reservations_org_place_status
      ON app_reservations(event_id, organization_id, place_id, status)`),
    env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_app_reservations_user_slot
      ON app_reservations(event_id, user_id, place_id, slot_start_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_reservation_updates (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      reservation_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      change_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_app_reservation_updates_reservation
      ON app_reservation_updates(event_id, reservation_id, created_at)`),
  ]);
  const reservationColumns = await env.DB.prepare('PRAGMA table_info(app_reservations)').all<{ name: string }>();
  if (!reservationColumns.results.some((column) => column.name === 'contact_expires_at')) {
    await env.DB.prepare("ALTER TABLE app_reservations ADD COLUMN contact_expires_at TEXT NOT NULL DEFAULT ''").run();
  }
  if (!reservationColumns.results.some((column) => column.name === 'activity_status')) {
    await env.DB.prepare("ALTER TABLE app_reservations ADD COLUMN activity_status TEXT NOT NULL DEFAULT 'confirmed'").run();
  }
  if (!reservationColumns.results.some((column) => column.name === 'change_message')) {
    await env.DB.prepare("ALTER TABLE app_reservations ADD COLUMN change_message TEXT NOT NULL DEFAULT ''").run();
  }
  if (!reservationColumns.results.some((column) => column.name === 'last_transition_id')) {
    await env.DB.prepare('ALTER TABLE app_reservations ADD COLUMN last_transition_id TEXT').run();
  }
  if (!reservationColumns.results.some((column) => column.name === 'arrival_time')) {
    await env.DB.prepare("ALTER TABLE app_reservations ADD COLUMN arrival_time TEXT NOT NULL DEFAULT ''").run();
  }
  if (!reservationColumns.results.some((column) => column.name === 'attendee_note')) {
    await env.DB.prepare("ALTER TABLE app_reservations ADD COLUMN attendee_note TEXT NOT NULL DEFAULT ''").run();
  }
  await env.DB.prepare(`UPDATE app_reservations
    SET contact_expires_at = COALESCE(
      strftime('%Y-%m-%dT%H:%M:%fZ', slot_end_at, '+7 days'),
      strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+7 days')
    )
    WHERE contact_expires_at = ''`).run();
  const updateColumns = await env.DB.prepare('PRAGMA table_info(app_reservation_updates)').all<{ name: string }>();
  if (!updateColumns.results.some((column) => column.name === 'change_message')) {
    await env.DB.prepare("ALTER TABLE app_reservation_updates ADD COLUMN change_message TEXT NOT NULL DEFAULT ''").run();
  }
  initialized = true;
}

async function scrubExpiredReservationContacts() {
  await env.DB.prepare(`UPDATE app_reservations
    SET email_snapshot = '', display_name = '已脱敏', arrival_time = '', attendee_note = ''
    WHERE event_id = ? AND contact_expires_at <> '' AND contact_expires_at <= ?
      AND (email_snapshot <> '' OR display_name <> '已脱敏' OR arrival_time <> '' OR attendee_note <> '')`)
      .bind(venue.eventId, new Date().toISOString()).run();
}

async function reservationForSlot(userId: string, placeId: string, slotStartAt: string) {
  return env.DB.prepare(`SELECT * FROM app_reservations
    WHERE event_id = ? AND user_id = ? AND place_id = ? AND slot_start_at = ? LIMIT 1`)
    .bind(venue.eventId, userId, placeId, slotStartAt).first<ReservationRecord>();
}

export async function listMyReservations(userId: string) {
  await ensureReservationTable();
  await scrubExpiredReservationContacts();
  const rows = await env.DB.prepare(`SELECT id, activity_title, slot_start_at, status, activity_status, change_message, arrival_time, attendee_note
    FROM app_reservations WHERE event_id = ? AND user_id = ? ORDER BY slot_start_at DESC`)
    .bind(venue.eventId, userId).all<VisitorReservationRecord>();
  return rows.results;
}

export async function listExhibitorReservations(organizationId: string, placeId: string) {
  await ensureReservationTable();
  await scrubExpiredReservationContacts();
  const now = new Date().toISOString();
  const rows = await env.DB.prepare(`SELECT id,
      CASE WHEN contact_expires_at <> '' AND contact_expires_at <= ? THEN '' ELSE email_snapshot END AS email_snapshot,
      CASE WHEN contact_expires_at <> '' AND contact_expires_at <= ? THEN '已脱敏' ELSE display_name END AS display_name,
      activity_title, slot_start_at, slot_end_at, status,
      CASE WHEN contact_expires_at <> '' AND contact_expires_at <= ? THEN '' ELSE arrival_time END AS arrival_time,
      CASE WHEN contact_expires_at <> '' AND contact_expires_at <= ? THEN '' ELSE attendee_note END AS attendee_note,
      created_at, updated_at FROM app_reservations
    WHERE event_id = ? AND organization_id = ? AND place_id = ? ORDER BY slot_start_at`)
    .bind(now, now, now, now, venue.eventId, organizationId, placeId).all<ExhibitorReservationRecord>();
  return rows.results;
}

export async function createReservation(user: AuthUser, offering: {
  organizationId: string;
  placeId: string;
  title: string;
  start: string;
  duration: number;
  capacity: number;
  status?: ReservationActivityStatus;
}) {
  await ensureReservationTable();
  const existing = await reservationForSlot(user.userId, offering.placeId, offering.start);
  if (existing && existing.status !== 'cancelled') return { reservation: existing, created: false };

  const now = new Date().toISOString();
  const { slotEndAt, contactExpiresAt } = activityWindow(offering.start, offering.duration);
  const activityStatus = offering.status === 'delayed' ? 'delayed' : 'confirmed';
  const changeMessage = activityStatus === 'delayed' ? '活动已延迟，请留意最新安排' : '';
  const transitionId = crypto.randomUUID();

  if (existing) {
    const results = await env.DB.batch([
      env.DB.prepare(`UPDATE app_reservations SET
          email_snapshot = ?, display_name = ?, organization_id = ?, activity_title = ?, slot_end_at = ?,
          status = 'pending', consent_version = 'reservation-v1', contact_expires_at = ?, activity_status = ?,
          change_message = ?, arrival_time = '', attendee_note = '', updated_at = ?, last_transition_id = ?
        WHERE id = ? AND event_id = ? AND user_id = ? AND place_id = ? AND slot_start_at = ? AND status = 'cancelled'
          AND (? = 0 OR (SELECT COUNT(*) FROM app_reservations
            WHERE event_id = ? AND place_id = ? AND slot_start_at = ? AND status IN ('pending','confirmed','arrived')) < ?)`)
        .bind(user.email, user.displayName, offering.organizationId, offering.title, slotEndAt, contactExpiresAt,
          activityStatus, changeMessage, now, transitionId, existing.id, venue.eventId, user.userId, offering.placeId,
          offering.start, offering.capacity, venue.eventId, offering.placeId, offering.start, offering.capacity),
      env.DB.prepare(`INSERT INTO app_reservation_updates
          (id, event_id, reservation_id, actor_id, from_status, to_status, change_message, created_at)
        SELECT ?, event_id, id, ?, 'cancelled', 'pending', ?, ? FROM app_reservations
        WHERE id = ? AND event_id = ? AND user_id = ? AND status = 'pending' AND last_transition_id = ?`)
        .bind(transitionId, user.userId, '访客重新提交预约', now, existing.id, venue.eventId, user.userId, transitionId),
    ]);
    if (changeCount(results[0]) === 1) {
      const reservation = await env.DB.prepare('SELECT * FROM app_reservations WHERE id = ?')
        .bind(existing.id).first<ReservationRecord>();
      return { reservation, created: true };
    }
    const latest = await reservationForSlot(user.userId, offering.placeId, offering.start);
    if (latest && latest.status !== 'cancelled') return { reservation: latest, created: false };
    throw new Error('RESERVATION_FULL');
  }

  const id = crypto.randomUUID();
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_reservations
        (id, tenant_id, event_id, user_id, email_snapshot, display_name, organization_id, place_id,
          activity_title, slot_start_at, slot_end_at, status, consent_version, contact_expires_at,
          activity_status, change_message, created_at, updated_at, last_transition_id)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'reservation-v1', ?, ?, ?, ?, ?, ?
      WHERE ? = 0 OR (SELECT COUNT(*) FROM app_reservations
        WHERE event_id = ? AND place_id = ? AND slot_start_at = ? AND status IN ('pending','confirmed','arrived')) < ?
      ON CONFLICT(event_id, user_id, place_id, slot_start_at) DO NOTHING`)
      .bind(id, tenantId, venue.eventId, user.userId, user.email, user.displayName, offering.organizationId,
        offering.placeId, offering.title, offering.start, slotEndAt, contactExpiresAt, activityStatus,
        changeMessage, now, now, transitionId, offering.capacity, venue.eventId, offering.placeId,
        offering.start, offering.capacity),
    env.DB.prepare(`INSERT INTO app_reservation_updates
        (id, event_id, reservation_id, actor_id, from_status, to_status, change_message, created_at)
      SELECT ?, event_id, id, ?, 'none', 'pending', ?, ? FROM app_reservations
      WHERE id = ? AND event_id = ? AND user_id = ? AND status = 'pending' AND last_transition_id = ?`)
      .bind(transitionId, user.userId, '访客提交预约', now, id, venue.eventId, user.userId, transitionId),
  ]);
  if (changeCount(results[0]) === 1) {
    const reservation = await env.DB.prepare('SELECT * FROM app_reservations WHERE id = ?').bind(id).first<ReservationRecord>();
    return { reservation, created: true };
  }
  const latest = await reservationForSlot(user.userId, offering.placeId, offering.start);
  if (latest && latest.status !== 'cancelled') return { reservation: latest, created: false };
  throw new Error('RESERVATION_FULL');
}

export async function cancelMyReservation(userId: string, reservationId: string) {
  await ensureReservationTable();
  const current = await env.DB.prepare(`SELECT status FROM app_reservations
    WHERE id = ? AND event_id = ? AND user_id = ?`)
    .bind(reservationId, venue.eventId, userId).first<{ status: ReservationStatus }>();
  if (!current || !['pending', 'confirmed'].includes(current.status)) return false;

  const now = new Date().toISOString();
  const transitionId = crypto.randomUUID();
  const message = '您已取消此预约';
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE app_reservations
      SET status = 'cancelled', change_message = ?, updated_at = ?, last_transition_id = ?
      WHERE id = ? AND event_id = ? AND user_id = ? AND status = ?`)
      .bind(message, now, transitionId, reservationId, venue.eventId, userId, current.status),
    env.DB.prepare(`INSERT INTO app_reservation_updates
        (id, event_id, reservation_id, actor_id, from_status, to_status, change_message, created_at)
      SELECT ?, event_id, id, ?, ?, 'cancelled', ?, ? FROM app_reservations
      WHERE id = ? AND event_id = ? AND user_id = ? AND status = 'cancelled' AND last_transition_id = ?`)
      .bind(transitionId, userId, current.status, message, now, reservationId, venue.eventId, userId, transitionId),
  ]);
  return changeCount(results[0]) === 1;
}

export async function modifyMyReservation(user: AuthUser, reservationId: string, input: { arrivalTime: string; attendeeNote: string }) {
  await ensureReservationTable();
  const current = await env.DB.prepare(`SELECT status, slot_start_at, slot_end_at, arrival_time, attendee_note FROM app_reservations
    WHERE id = ? AND event_id = ? AND user_id = ? AND status IN ('pending','confirmed') AND slot_end_at > ?`)
    .bind(reservationId, venue.eventId, user.userId, new Date().toISOString()).first<{ status: ReservationStatus; slot_start_at: string; slot_end_at: string; arrival_time: string; attendee_note: string }>();
  if (!current) return false;
  const arrivalTime = input.arrivalTime.trim();
  const attendeeNote = input.attendeeNote.trim();
  if (attendeeNote.length > 200) throw new Error('RESERVATION_MODIFICATION_INVALID');
  if (arrivalTime && !/^\d{2}:\d{2}$/.test(arrivalTime)) throw new Error('RESERVATION_MODIFICATION_INVALID');
  if (arrivalTime) {
    const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
    const arrivalMinutes = arrivalHour * 60 + arrivalMinute;
    const startMinutes = shanghaiClockMinutes(current.slot_start_at);
    const endMinutes = shanghaiClockMinutes(current.slot_end_at);
    const normalizedEnd = endMinutes < startMinutes ? endMinutes + 24 * 60 : endMinutes;
    const normalizedArrival = arrivalMinutes < startMinutes ? arrivalMinutes + 24 * 60 : arrivalMinutes;
    if (!Number.isFinite(arrivalMinutes) || arrivalHour > 23 || arrivalMinute > 59 || !Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || normalizedArrival < startMinutes || normalizedArrival > normalizedEnd) {
      throw new Error('RESERVATION_MODIFICATION_INVALID');
    }
  }
  if (arrivalTime === current.arrival_time && attendeeNote === current.attendee_note) throw new Error('RESERVATION_MODIFICATION_UNCHANGED');
  const now = new Date().toISOString();
  const transitionId = crypto.randomUUID();
  const message = '访客已更新预计到达时间或接待备注';
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE app_reservations SET email_snapshot = ?, display_name = ?, arrival_time = ?, attendee_note = ?,
        change_message = ?, updated_at = ?, last_transition_id = ?
      WHERE id = ? AND event_id = ? AND user_id = ? AND status = ?`)
      .bind(user.email, user.displayName, arrivalTime, attendeeNote, message, now, transitionId, reservationId, venue.eventId, user.userId, current.status),
    env.DB.prepare(`INSERT INTO app_reservation_updates
        (id, event_id, reservation_id, actor_id, from_status, to_status, change_message, created_at)
      SELECT ?, event_id, id, ?, ?, ?, ?, ? FROM app_reservations
      WHERE id = ? AND event_id = ? AND user_id = ? AND status = ? AND last_transition_id = ?`)
      .bind(transitionId, user.userId, current.status, current.status, message, now, reservationId, venue.eventId, user.userId, current.status, transitionId),
  ]);
  return changeCount(results[0]) === 1;
}

export async function updateExhibitorReservation(
  organizationId: string,
  placeId: string,
  reservationId: string,
  status: ReservationStatus,
  actorId: string,
) {
  await ensureReservationTable();
  const current = await env.DB.prepare(`SELECT status FROM app_reservations
    WHERE id = ? AND event_id = ? AND organization_id = ? AND place_id = ?`)
    .bind(reservationId, venue.eventId, organizationId, placeId).first<{ status: ReservationStatus }>();
  if (!current) return false;
  const transitions: Record<ReservationStatus, ReservationStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['arrived', 'no_show', 'cancelled'],
    arrived: ['completed'],
    completed: [],
    no_show: [],
    cancelled: [],
  };
  if (!transitions[current.status].includes(status)) return false;
  const now = new Date().toISOString();
  const transitionId = crypto.randomUUID();
  const message = status === 'confirmed' ? '展商已确认预约' : status === 'arrived' ? '已确认到场' : status === 'completed' ? '预约已完成' : status === 'no_show' ? '已记录未到场' : '展商已取消预约';
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE app_reservations SET status = ?, change_message = ?, updated_at = ?, last_transition_id = ?
      WHERE id = ? AND event_id = ? AND organization_id = ? AND place_id = ? AND status = ?`)
      .bind(status, message, now, transitionId, reservationId, venue.eventId, organizationId, placeId, current.status),
    env.DB.prepare(`INSERT INTO app_reservation_updates
        (id, event_id, reservation_id, actor_id, from_status, to_status, change_message, created_at)
      SELECT ?, event_id, id, ?, ?, ?, ?, ? FROM app_reservations
      WHERE id = ? AND event_id = ? AND organization_id = ? AND place_id = ? AND status = ? AND last_transition_id = ?`)
      .bind(transitionId, actorId, current.status, status, message, now, reservationId, venue.eventId,
        organizationId, placeId, status, transitionId),
  ]);
  return changeCount(results[0]) === 1;
}

export async function syncReservationsForActivity(input: ReservationActivitySync) {
  await ensureReservationTable();
  if (!input.previousStart) return { updated: 0, cancelled: 0 };

  const now = new Date().toISOString();
  const message = input.status === 'cancelled'
    ? '活动已取消，预约同步取消'
    : input.status === 'delayed'
      ? input.start === input.previousStart ? '活动已延迟，最新开始时间待确认' : '活动时间已调整，请查看最新安排'
      : '活动安排已更新，请查看最新时间';
  const rootTransitionId = crypto.randomUUID();
  const statements: SqlPreparedStatement[] = [];

  for (const reservationStatus of ['pending', 'confirmed', 'arrived'] as const) {
    const transitionId = `${rootTransitionId}:${reservationStatus}`;
    if (input.status === 'cancelled') {
      statements.push(
        env.DB.prepare(`UPDATE app_reservations
          SET status = 'cancelled', activity_status = 'cancelled', change_message = ?, updated_at = ?, last_transition_id = ?
          WHERE event_id = ? AND organization_id = ? AND place_id = ? AND slot_start_at = ? AND status = ?`)
          .bind(message, now, transitionId, venue.eventId, input.organizationId, input.placeId, input.previousStart, reservationStatus),
        env.DB.prepare(`INSERT INTO app_reservation_updates
            (id, event_id, reservation_id, actor_id, from_status, to_status, change_message, created_at)
          SELECT ? || ':' || id, event_id, id, ?, ?, 'cancelled', ?, ? FROM app_reservations
          WHERE event_id = ? AND organization_id = ? AND place_id = ? AND status = 'cancelled' AND last_transition_id = ?`)
          .bind(transitionId, input.actorId, reservationStatus, message, now, venue.eventId,
            input.organizationId, input.placeId, transitionId),
      );
      continue;
    }

    const { slotEndAt, contactExpiresAt } = activityWindow(input.start, input.duration);
    statements.push(
      env.DB.prepare(`UPDATE app_reservations
        SET activity_title = ?, arrival_time = CASE WHEN slot_start_at <> ? THEN '' ELSE arrival_time END,
          slot_start_at = ?, slot_end_at = ?, contact_expires_at = ?, activity_status = ?,
          change_message = ?, updated_at = ?, last_transition_id = ?
        WHERE event_id = ? AND organization_id = ? AND place_id = ? AND slot_start_at = ? AND status = ?`)
        .bind(input.title, input.start, input.start, slotEndAt, contactExpiresAt, input.status, message, now, transitionId,
          venue.eventId, input.organizationId, input.placeId, input.previousStart, reservationStatus),
      env.DB.prepare(`INSERT INTO app_reservation_updates
          (id, event_id, reservation_id, actor_id, from_status, to_status, change_message, created_at)
        SELECT ? || ':' || id, event_id, id, ?, ?, ?, ?, ? FROM app_reservations
        WHERE event_id = ? AND organization_id = ? AND place_id = ? AND status = ? AND last_transition_id = ?`)
        .bind(transitionId, input.actorId, reservationStatus, reservationStatus, message, now, venue.eventId,
          input.organizationId, input.placeId, reservationStatus, transitionId),
    );
  }

  const results = await env.DB.batch(statements);
  const updated = results.filter((_, index) => index % 2 === 0).reduce((total, result) => total + changeCount(result), 0);
  return { updated, cancelled: input.status === 'cancelled' ? updated : 0 };
}
