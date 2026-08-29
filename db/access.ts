import { env } from 'cloudflare:workers';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import { venue } from '@/lib/venue';

export type Membership = {
  role: 'venue_admin' | 'exhibitor_admin';
  organizationId: string | null;
  placeId: string | null;
};

const tenantId = 'tenant-thousand-hackathon';
let initialized = false;

async function ensureMembershipTable() {
  if (initialized) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_memberships (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      email_snapshot TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      organization_id TEXT,
      place_id TEXT,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_app_memberships_user_event
      ON app_memberships(user_id, event_id)`),
    env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_app_memberships_event_role_user
      ON app_memberships(event_id, role, user_id)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_pending_memberships (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      email_normalized TEXT NOT NULL,
      role TEXT NOT NULL,
      invited_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      consumed_by TEXT
    )`),
    env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_app_pending_event_email_role
      ON app_pending_memberships(event_id, email_normalized, role)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_audit (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_key TEXT NOT NULL,
      after_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
  ]);
  initialized = true;
}

async function findMembership(userId: string, role: Membership['role']) {
  return env.DB.prepare(`SELECT role, organization_id, place_id
    FROM app_memberships WHERE event_id = ? AND user_id = ? AND role = ? LIMIT 1`)
    .bind(venue.eventId, userId, role)
    .first<{ role: Membership['role']; organization_id: string | null; place_id: string | null }>();
}

export async function ensureOperationsAccess(user: ChatGPTUser): Promise<Membership | null> {
  await ensureMembershipTable();
  let row = await findMembership(user.userId, 'venue_admin');
  if (!row) {
    const normalizedEmail = user.email.trim().toLowerCase();
    const pending = await env.DB.prepare(`SELECT id FROM app_pending_memberships
      WHERE event_id = ? AND role = 'venue_admin' AND email_normalized = ? AND consumed_by IS NULL LIMIT 1`)
      .bind(venue.eventId, normalizedEmail).first<{ id: string }>();
    if (pending) {
      await env.DB.batch([
        env.DB.prepare('UPDATE app_pending_memberships SET consumed_by = ? WHERE id = ? AND consumed_by IS NULL').bind(user.userId, pending.id),
        env.DB.prepare(`INSERT INTO app_memberships
          (id, tenant_id, event_id, user_id, email_snapshot, display_name, role, organization_id, place_id, created_at)
          SELECT ?, ?, ?, ?, ?, ?, 'venue_admin', NULL, NULL, ?
          FROM app_pending_memberships WHERE id = ? AND consumed_by = ?
          ON CONFLICT(event_id, role, user_id) DO NOTHING`)
          .bind(crypto.randomUUID(), tenantId, venue.eventId, user.userId, user.email, user.displayName, new Date().toISOString(), pending.id, user.userId),
      ]);
    }
    row = await findMembership(user.userId, 'venue_admin');
    if (row && pending) {
      await env.DB.prepare(`INSERT INTO app_audit
        (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
        VALUES (?, ?, ?, ?, 'operations_member_joined', ?, ?, ?)`)
        .bind(crypto.randomUUID(), tenantId, venue.eventId, user.userId, `membership:${venue.eventId}:venue_admin`, JSON.stringify({ changed_fields: ['members'] }), new Date().toISOString()).run();
    }
  }
  return row ? { role: row.role, organizationId: row.organization_id, placeId: row.place_id } : null;
}

export async function ensureExhibitorAccess(user: ChatGPTUser): Promise<Membership | null> {
  await ensureMembershipTable();
  const row = await findMembership(user.userId, 'exhibitor_admin');
  return row ? { role: row.role, organizationId: row.organization_id, placeId: row.place_id } : null;
}

export async function listOperationsMembers() {
  await ensureMembershipTable();
  const members = await env.DB.prepare(`SELECT user_id, email_snapshot, display_name, created_at
    FROM app_memberships WHERE event_id = ? AND role = 'venue_admin' ORDER BY created_at`).bind(venue.eventId).all<{ user_id: string; email_snapshot: string; display_name: string; created_at: string }>();
  const pending = await env.DB.prepare(`SELECT id, email_normalized, created_at
    FROM app_pending_memberships WHERE event_id = ? AND role = 'venue_admin' AND consumed_by IS NULL ORDER BY created_at`).bind(venue.eventId).all<{ id: string; email_normalized: string; created_at: string }>();
  return { members: members.results, pending: pending.results };
}

export async function inviteOperationsMember(email: string, actorId: string) {
  await ensureMembershipTable();
  const normalized = email.trim().toLowerCase();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_pending_memberships
      (id, tenant_id, event_id, email_normalized, role, invited_by, created_at, consumed_by)
      VALUES (?, ?, ?, ?, 'venue_admin', ?, ?, NULL)
      ON CONFLICT(event_id, email_normalized, role) DO UPDATE SET invited_by = excluded.invited_by, created_at = excluded.created_at, consumed_by = NULL`)
      .bind(crypto.randomUUID(), tenantId, venue.eventId, normalized, actorId, now),
    env.DB.prepare(`INSERT INTO app_audit
      (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
      VALUES (?, ?, ?, ?, 'operations_member_invited', ?, ?, ?)`)
      .bind(crypto.randomUUID(), tenantId, venue.eventId, actorId, `membership:${venue.eventId}:venue_admin`, JSON.stringify({ changed_fields: ['members'] }), now),
  ]);
}
