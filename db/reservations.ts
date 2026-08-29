import { env } from 'cloudflare:workers';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import { venue } from '@/lib/venue';

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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type ExhibitorReservationRecord = Pick<ReservationRecord, 'id' | 'email_snapshot' | 'display_name' | 'activity_title' | 'slot_start_at' | 'slot_end_at' | 'status' | 'created_at' | 'updated_at'>;
export type VisitorReservationRecord = Pick<ReservationRecord, 'id' | 'activity_title' | 'slot_start_at' | 'status'>;

const tenantId = 'tenant-thousand-hackathon';
let initialized = false;

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
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_app_reservation_updates_reservation
      ON app_reservation_updates(event_id, reservation_id, created_at)`),
  ]);
  initialized = true;
}

export async function listMyReservations(userId: string) {
  await ensureReservationTable();
  const rows = await env.DB.prepare(`SELECT id, activity_title, slot_start_at, status FROM app_reservations
    WHERE event_id = ? AND user_id = ? ORDER BY slot_start_at DESC`)
    .bind(venue.eventId, userId).all<VisitorReservationRecord>();
  return rows.results;
}

export async function listExhibitorReservations(organizationId: string, placeId: string) {
  await ensureReservationTable();
  const rows = await env.DB.prepare(`SELECT id, email_snapshot, display_name, activity_title, slot_start_at,
      slot_end_at, status, created_at, updated_at FROM app_reservations
    WHERE event_id = ? AND organization_id = ? AND place_id = ? ORDER BY slot_start_at`)
    .bind(venue.eventId, organizationId, placeId).all<ExhibitorReservationRecord>();
  return rows.results;
}

export async function createReservation(user: ChatGPTUser, offering: { organizationId: string; placeId: string; title: string; start: string; duration: number; capacity: number }) {
  await ensureReservationTable();
  const existing = await env.DB.prepare(`SELECT * FROM app_reservations
    WHERE event_id = ? AND user_id = ? AND place_id = ? AND slot_start_at = ? LIMIT 1`)
    .bind(venue.eventId, user.userId, offering.placeId, offering.start).first<ReservationRecord>();
  if (existing && existing.status !== 'cancelled') return { reservation: existing, created: false };
  const now = new Date().toISOString();
  const parsedStart = new Date(`${offering.start}:00+08:00`);
  const slotEndAt = Number.isNaN(parsedStart.getTime()) ? offering.start : new Date(parsedStart.getTime() + offering.duration * 60000).toISOString();
  const id = existing?.id ?? crypto.randomUUID();
  const result = await env.DB.prepare(`INSERT INTO app_reservations
    (id, tenant_id, event_id, user_id, email_snapshot, display_name, organization_id, place_id, activity_title, slot_start_at, slot_end_at, status, consent_version, created_at, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'reservation-v1', ?, ?
    WHERE ? = 0 OR (SELECT COUNT(*) FROM app_reservations WHERE event_id = ? AND place_id = ? AND slot_start_at = ? AND status IN ('pending','confirmed')) < ?
    ON CONFLICT(event_id, user_id, place_id, slot_start_at) DO UPDATE SET
      email_snapshot = excluded.email_snapshot,
      display_name = excluded.display_name,
      activity_title = excluded.activity_title,
      slot_end_at = excluded.slot_end_at,
      status = 'pending',
      consent_version = excluded.consent_version,
      updated_at = excluded.updated_at`)
    .bind(id, tenantId, venue.eventId, user.userId, user.email, user.displayName, offering.organizationId, offering.placeId, offering.title, offering.start, slotEndAt, now, now, offering.capacity, venue.eventId, offering.placeId, offering.start, offering.capacity).run();
  if (Number((result.meta as { changes?: number }).changes ?? 0) !== 1) throw new Error('RESERVATION_FULL');
  const reservation = await env.DB.prepare('SELECT * FROM app_reservations WHERE id = ?').bind(id).first<ReservationRecord>();
  return { reservation, created: true };
}

export async function cancelMyReservation(userId: string, reservationId: string) {
  await ensureReservationTable();
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`UPDATE app_reservations SET status = 'cancelled', updated_at = ?
    WHERE id = ? AND event_id = ? AND user_id = ? AND status IN ('pending','confirmed')`)
    .bind(now, reservationId, venue.eventId, userId).run();
  return Number((result.meta as { changes?: number }).changes ?? 0) === 1;
}

export async function updateExhibitorReservation(organizationId: string, placeId: string, reservationId: string, status: ReservationRecord['status'], actorId: string) {
  await ensureReservationTable();
  const current = await env.DB.prepare(`SELECT status FROM app_reservations
    WHERE id = ? AND event_id = ? AND organization_id = ? AND place_id = ?`)
    .bind(reservationId, venue.eventId, organizationId, placeId).first<{ status: ReservationRecord['status'] }>();
  if (!current) return false;
  const transitions: Record<ReservationRecord['status'], ReservationRecord['status'][]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };
  if (!transitions[current.status].includes(status)) return false;
  const now = new Date().toISOString();
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE app_reservations SET status = ?, updated_at = ?
      WHERE id = ? AND event_id = ? AND organization_id = ? AND place_id = ? AND status = ?`)
      .bind(status, now, reservationId, venue.eventId, organizationId, placeId, current.status),
    env.DB.prepare(`INSERT INTO app_reservation_updates
      (id, event_id, reservation_id, actor_id, from_status, to_status, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (
        SELECT 1 FROM app_reservations WHERE id = ? AND event_id = ? AND status = ? AND updated_at = ?
      )`).bind(crypto.randomUUID(), venue.eventId, reservationId, actorId, current.status, status, now, reservationId, venue.eventId, status, now),
  ]);
  return Number((results[0].meta as { changes?: number }).changes ?? 0) === 1;
}
