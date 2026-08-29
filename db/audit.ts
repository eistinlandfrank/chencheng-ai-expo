import { env } from 'cloudflare:workers';
import { venue } from '@/lib/venue';

export type AuditEntry = {
  id: string;
  actor_label: string;
  action: string;
  created_at: string;
};

export async function listRecentAuditEntries(limit = 40) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_audit (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_key TEXT NOT NULL,
    after_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  const rows = await env.DB.prepare(`SELECT a.id, COALESCE(m.display_name, '场馆成员') AS actor_label, a.action, a.created_at
    FROM app_audit a
    LEFT JOIN app_memberships m ON m.event_id = a.event_id AND m.user_id = a.actor_id AND m.role = 'venue_admin'
    WHERE a.event_id = ? ORDER BY a.created_at DESC LIMIT ?`)
    .bind(venue.eventId, Math.max(1, Math.min(100, limit))).all<AuditEntry>();
  return rows.results;
}
