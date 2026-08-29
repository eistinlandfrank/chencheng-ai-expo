import { env } from '@/db/runtime';
import { venue } from '@/lib/venue';

export const analyticsEventNames = [
  'visitor_session_started',
  'position_confirmed',
  'search_submitted',
  'search_no_result',
  'booth_viewed',
  'itinerary_created',
  'itinerary_stop_added',
  'route_started',
  'route_replanned',
  'stop_arrived',
  'stop_completed',
  'reservation_created',
  'consent_granted',
] as const;

export const clientAnalyticsEventNames = [
  'visitor_session_started',
  'position_confirmed',
  'search_submitted',
  'search_no_result',
  'booth_viewed',
  'itinerary_created',
  'itinerary_stop_added',
  'route_started',
  'route_replanned',
  'stop_arrived',
  'stop_completed',
] as const;

export type AnalyticsEventName = typeof analyticsEventNames[number];
export type ClientAnalyticsEventName = typeof clientAnalyticsEventNames[number];
type AnalyticsRole = 'visitor' | 'exhibitor' | 'operations';
type AnalyticsProperty = string | number | boolean;
type AnalyticsMetric = { value: number | null; suppressed: boolean };

const tenantId = 'tenant-thousand-hackathon';
let initialized = false;

async function ensureAnalyticsTable() {
  if (initialized) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_analytics_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      role TEXT NOT NULL,
      anonymous_id_hash TEXT,
      user_id_hash TEXT,
      organization_id TEXT,
      place_id TEXT,
      event_name TEXT NOT NULL,
      map_version TEXT NOT NULL,
      request_id TEXT NOT NULL,
      properties_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_app_analytics_event_time
      ON app_analytics_events(event_id, event_name, created_at)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_app_analytics_place_time
      ON app_analytics_events(event_id, place_id, event_name, created_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_analytics_rate_limits (
      key_hash TEXT PRIMARY KEY,
      request_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_app_analytics_rate_expiry
      ON app_analytics_rate_limits(expires_at)`),
  ]);
  initialized = true;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cleanProperties(eventName: AnalyticsEventName, input: Record<string, unknown> | undefined) {
  if (!input) return {};
  const result: Record<string, AnalyticsProperty> = {};
  if (eventName === 'search_submitted' || eventName === 'search_no_result') {
    const query = typeof input.query === 'string' ? input.query.trim().toLocaleLowerCase('zh-CN') : '';
    const groups = ['硬件', '软件', '机器人', '活动', '服务', '网络', '电力', '物料', '休息', '入口', '出口', '无障碍', '开发', '赞助'];
    const group = groups.find((item) => query.includes(item.toLocaleLowerCase('zh-CN')));
    if (query) result.query = group ?? '其他关键词';
    if (typeof input.result_count === 'number' && Number.isFinite(input.result_count)) result.result_count = Math.max(0, Math.min(1000, Math.round(input.result_count)));
  }
  if (eventName === 'position_confirmed' && ['qr', 'manual'].includes(String(input.source))) result.source = String(input.source);
  if (eventName === 'itinerary_created' && typeof input.stop_count === 'number' && Number.isFinite(input.stop_count)) result.stop_count = Math.max(0, Math.min(100, Math.round(input.stop_count)));
  if (eventName === 'route_replanned' && ['position', 'delay', 'closure', 'manual'].includes(String(input.reason))) result.reason = String(input.reason);
  return result;
}

function analyticsTimeBucket(date = new Date()) {
  const bucketMs = 15 * 60 * 1000;
  return new Date(Math.floor(date.getTime() / bucketMs) * bucketMs).toISOString();
}

export async function analyticsRateAllowed(anonymousId: string, ipAddress: string) {
  await ensureAnalyticsTable();
  const bucket = analyticsTimeBucket();
  const expiresAt = new Date(new Date(bucket).getTime() + 30 * 60 * 1000).toISOString();
  const [sessionKey, networkKey] = await Promise.all([
    sha256(`${venue.eventId}:session:${anonymousId}:${bucket}`),
    sha256(`${venue.eventId}:network:${ipAddress}:${bucket}`),
  ]);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM app_analytics_rate_limits WHERE expires_at < ?').bind(new Date().toISOString()),
    env.DB.prepare(`INSERT INTO app_analytics_rate_limits (key_hash, request_count, expires_at)
      VALUES (?, 1, ?) ON CONFLICT(key_hash) DO UPDATE SET request_count = request_count + 1, expires_at = excluded.expires_at`)
      .bind(sessionKey, expiresAt),
    env.DB.prepare(`INSERT INTO app_analytics_rate_limits (key_hash, request_count, expires_at)
      VALUES (?, 1, ?) ON CONFLICT(key_hash) DO UPDATE SET request_count = request_count + 1, expires_at = excluded.expires_at`)
      .bind(networkKey, expiresAt),
  ]);
  const counts = await env.DB.prepare('SELECT key_hash, request_count FROM app_analytics_rate_limits WHERE key_hash IN (?, ?)')
    .bind(sessionKey, networkKey).all<{ key_hash: string; request_count: number }>();
  const byKey = new Map(counts.results.map((row) => [row.key_hash, Number(row.request_count)]));
  return (byKey.get(sessionKey) ?? 0) <= 120 && (byKey.get(networkKey) ?? 0) <= 360;
}

export async function recordAnalyticsEvent(input: {
  eventName: AnalyticsEventName;
  role: AnalyticsRole;
  anonymousId?: string;
  userId?: string;
  organizationId?: string;
  placeId?: string;
  requestId: string;
  dedupKey?: string;
  mapVersion?: string;
  properties?: Record<string, unknown>;
}) {
  await ensureAnalyticsTable();
  const cleanedProperties = cleanProperties(input.eventName, input.properties);
  const subjectScope = [
    venue.eventId,
    input.eventName,
    input.placeId ?? '',
    typeof cleanedProperties.query === 'string' ? cleanedProperties.query : '',
    new Date().toISOString().slice(0, 10),
  ].join(':');
  const [anonymousIdHash, userIdHash] = await Promise.all([
    input.anonymousId ? sha256(`${subjectScope}:${input.anonymousId}`) : Promise.resolve(null),
    input.userId ? sha256(`${subjectScope}:${input.userId}`) : Promise.resolve(null),
  ]);
  const subject = input.anonymousId ?? input.userId ?? crypto.randomUUID();
  const recordId = input.dedupKey ? await sha256(`${subjectScope}:${subject}:${input.dedupKey}`) : crypto.randomUUID();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM app_analytics_events WHERE event_id = ? AND created_at < ?').bind(venue.eventId, cutoff),
    env.DB.prepare(`INSERT INTO app_analytics_events
      (id, tenant_id, event_id, role, anonymous_id_hash, user_id_hash, organization_id, place_id, event_name, map_version, request_id, properties_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING`)
      .bind(recordId, tenantId, venue.eventId, input.role, anonymousIdHash, userIdHash, input.organizationId ?? null, input.placeId ?? null, input.eventName, input.mapVersion ?? venue.mapVersion, input.requestId, JSON.stringify(cleanedProperties), analyticsTimeBucket()),
  ]);
}

function metric(value: number, subjects: number): AnalyticsMetric {
  const suppressed = subjects > 0 && subjects < 3;
  return { value: suppressed ? null : value, suppressed };
}

async function countsSince(since: string, placeId?: string) {
  await ensureAnalyticsTable();
  await env.DB.prepare('DELETE FROM app_analytics_events WHERE event_id = ? AND created_at < ?')
    .bind(venue.eventId, new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()).run();
  const where = placeId ? 'event_id = ? AND place_id = ? AND created_at >= ?' : 'event_id = ? AND created_at >= ?';
  const statement = env.DB.prepare(`SELECT event_name, COUNT(*) AS total,
    COUNT(DISTINCT COALESCE(anonymous_id_hash, user_id_hash, id)) AS subjects
    FROM app_analytics_events WHERE ${where} GROUP BY event_name`);
  const rows = placeId
    ? await statement.bind(venue.eventId, placeId, since).all<{ event_name: AnalyticsEventName; total: number; subjects: number }>()
    : await statement.bind(venue.eventId, since).all<{ event_name: AnalyticsEventName; total: number; subjects: number }>();
  return Object.fromEntries(rows.results.map((row) => [row.event_name, { total: Number(row.total), subjects: Number(row.subjects) }])) as Partial<Record<AnalyticsEventName, { total: number; subjects: number }>>;
}

export async function getOperationsAnalytics() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const counts = await countsSince(since);
  const sessions = await env.DB.prepare(`SELECT COUNT(DISTINCT anonymous_id_hash) AS total FROM app_analytics_events
    WHERE event_id = ? AND event_name = 'visitor_session_started' AND anonymous_id_hash IS NOT NULL AND created_at >= ?`).bind(venue.eventId, since).first<{ total: number }>();
  const keywords = await env.DB.prepare(`SELECT json_extract(properties_json, '$.query') AS keyword, COUNT(*) AS total,
      COUNT(DISTINCT anonymous_id_hash) AS subjects
    FROM app_analytics_events
    WHERE event_id = ? AND event_name = 'search_submitted' AND created_at >= ?
      AND json_extract(properties_json, '$.query') IS NOT NULL
    GROUP BY keyword HAVING COUNT(DISTINCT anonymous_id_hash) >= 3 ORDER BY total DESC LIMIT 8`)
    .bind(venue.eventId, since).all<{ keyword: string; total: number; subjects: number }>();
  const count = (name: AnalyticsEventName) => counts[name] ?? { total: 0, subjects: 0 };
  const activeSessions = Number(sessions?.total ?? 0);
  return {
    range: { label: '最近 24 小时', since, until: new Date().toISOString() },
    metrics: {
      active_sessions: metric(activeSessions, activeSessions),
      searches: metric(count('search_submitted').total, count('search_submitted').subjects),
      no_result_searches: metric(count('search_no_result').total, count('search_no_result').subjects),
      booth_views: metric(count('booth_viewed').total, count('booth_viewed').subjects),
      routes_started: metric(count('route_started').total, count('route_started').subjects),
      arrivals: metric(count('stop_arrived').total, count('stop_arrived').subjects),
      reservations: metric(count('reservation_created').total, count('reservation_created').subjects),
    },
    keywords: keywords.results.map((row) => ({ keyword: row.keyword, total: Number(row.total) })),
  };
}

export async function getExhibitorAnalytics(placeId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const counts = await countsSince(since, placeId);
  const count = (name: AnalyticsEventName) => counts[name] ?? { total: 0, subjects: 0 };
  return {
    range: { label: '最近 24 小时', since, until: new Date().toISOString() },
    funnel: {
      booth_views: metric(count('booth_viewed').total, count('booth_viewed').subjects),
      itinerary_adds: metric(count('itinerary_stop_added').total, count('itinerary_stop_added').subjects),
      routes_started: metric(count('route_started').total, count('route_started').subjects),
      arrivals: metric(count('stop_arrived').total, count('stop_arrived').subjects),
      reservations: metric(count('reservation_created').total, count('reservation_created').subjects),
    },
  };
}
