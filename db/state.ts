import { env } from 'cloudflare:workers';

type StateRecord<T> = {
  value: T;
  revision: number;
  updatedAt: string;
  updatedBy: string;
};

export class StateConflictError extends Error {
  constructor() {
    super('state_conflict');
    this.name = 'StateConflictError';
  }
}

let initialized = false;

async function ensureStateTables() {
  if (initialized) return;
  const d1 = env.DB;
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      value_json TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0,
      write_token TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL
    )`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_app_state_event_scope
      ON app_state(event_id, scope)`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS app_audit (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_key TEXT NOT NULL,
      after_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_app_audit_event_created
      ON app_audit(event_id, created_at)`),
  ]);
  const columns = await d1.prepare('PRAGMA table_info(app_state)').all<{ name: string }>();
  if (!columns.results.some((column) => column.name === 'revision')) {
    await d1.prepare('ALTER TABLE app_state ADD COLUMN revision INTEGER NOT NULL DEFAULT 0').run();
  }
  if (!columns.results.some((column) => column.name === 'write_token')) {
    await d1.prepare("ALTER TABLE app_state ADD COLUMN write_token TEXT NOT NULL DEFAULT ''").run();
  }
  initialized = true;
}

function changedFields(previousJson: string | null, nextValue: unknown) {
  let previous: Record<string, unknown> = {};
  try {
    const parsed = previousJson ? JSON.parse(previousJson) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) previous = parsed as Record<string, unknown>;
  } catch {
    previous = {};
  }
  const next = nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)
    ? nextValue as Record<string, unknown>
    : {};
  return Array.from(new Set([...Object.keys(previous), ...Object.keys(next)]))
    .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]))
    .slice(0, 30);
}

export async function readState<T>(key: string, fallback: T): Promise<StateRecord<T>> {
  await ensureStateTables();
  const row = await env.DB.prepare(
    'SELECT value_json, revision, updated_at, updated_by FROM app_state WHERE key = ?',
  ).bind(key).first<{ value_json: string; revision: number; updated_at: string; updated_by: string }>();
  if (!row) return { value: fallback, revision: 0, updatedAt: '', updatedBy: '' };
  try {
    const parsed = JSON.parse(row.value_json) as T;
    const value = typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback) && typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? { ...fallback, ...parsed } as T
      : parsed;
    return { value, revision: row.revision, updatedAt: row.updated_at, updatedBy: row.updated_by };
  } catch {
    return { value: fallback, revision: row.revision, updatedAt: '', updatedBy: '' };
  }
}

export async function writeState<T>({
  key,
  tenantId,
  eventId,
  scope,
  ownerId,
  actorId,
  action,
  value,
  expectedRevision,
}: {
  key: string;
  tenantId: string;
  eventId: string;
  scope: string;
  ownerId: string;
  actorId: string;
  action: string;
  value: T;
  expectedRevision: number;
}) {
  await ensureStateTables();
  const current = await env.DB.prepare('SELECT value_json FROM app_state WHERE key = ? AND revision = ?')
    .bind(key, expectedRevision).first<{ value_json: string }>();
  const now = new Date().toISOString();
  const writeToken = crypto.randomUUID();
  const serialized = JSON.stringify(value);
  const nextRevision = expectedRevision + 1;
  const fields = changedFields(current?.value_json ?? null, value);
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_state
      (key, tenant_id, event_id, scope, owner_id, value_json, revision, write_token, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        revision = app_state.revision + 1,
        write_token = excluded.write_token,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
      WHERE app_state.revision = ?`).bind(key, tenantId, eventId, scope, ownerId, serialized, writeToken, now, actorId, expectedRevision),
    env.DB.prepare(`INSERT INTO app_audit
      (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM app_state WHERE key = ? AND revision = ? AND write_token = ?)`)
      .bind(crypto.randomUUID(), tenantId, eventId, actorId, action, key, JSON.stringify({ revision: nextRevision, changed_fields: fields }), now, key, nextRevision, writeToken),
  ]);
  const changes = Number((results[0].meta as { changes?: number } | undefined)?.changes ?? 0);
  if (changes !== 1) throw new StateConflictError();
  return { value, revision: nextRevision, updatedAt: now, updatedBy: actorId };
}
