import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { env } from '@/db/runtime';
import { venue } from '@/lib/venue';

export type AuthUser = {
  userId: string;
  email: string;
  displayName: string;
};

export type AuthSession = {
  id: string;
  user: AuthUser;
  csrfTokenHash: string;
  authLevel: number;
  expiresAt: string;
};

export type MembershipRole =
  | 'venue_admin'
  | 'organizer_admin'
  | 'map_editor'
  | 'map_reviewer'
  | 'dispatcher'
  | 'notice_publisher'
  | 'audit_viewer'
  | 'exhibitor_admin'
  | 'content_editor'
  | 'reception_staff'
  | 'analytics_viewer';

export type ActivationRecord = {
  id: string;
  user_id: string;
  tenant_id: string;
  event_id: string;
  email_normalized: string;
  display_name: string;
  role: MembershipRole;
  organization_id: string | null;
  place_id: string | null;
  expires_at: string;
};

type StoredChallenge = {
  id: string;
  purpose: 'login' | 'activation';
  challenge: string;
  activation_id: string | null;
  expires_at: string;
};

type StoredPasskey = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key_base64: string;
  counter: number;
  transports_json: string;
};

type StoredPasswordCredential = {
  user_id: string;
  status: string;
  algorithm: string;
  cost_n: number;
  block_size: number;
  parallelization: number;
  key_length: number;
  salt_base64: string;
  hash_base64: string;
};

type RegistrationResponse = Parameters<typeof verifyRegistrationResponse>[0]['response'];
type AuthenticationResponse = Parameters<typeof verifyAuthenticationResponse>[0]['response'];

const tenantId = 'tenant-thousand-hackathon';
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const sessionIdleLifetimeMs = 30 * 60 * 1000;
const challengeLifetimeMs = 5 * 60 * 1000;
const activationLifetimeMs = 15 * 60 * 1000;
const activationAttemptLimit = 5;
const passwordMinimumLength = 12;
const passwordMaximumLength = 128;
const passwordDefaults = {
  costN: 32_768,
  blockSize: 8,
  parallelization: 1,
  keyLength: 64,
};
const dummyPasswordSalt = Buffer.from('expo-service-ai-password-dummy-salt', 'utf8');
const dummyPasswordHash = Buffer.alloc(passwordDefaults.keyLength);
let schemaProbe: Promise<void> | null = null;

function runtimeValue(name: string) {
  return String(process.env[name] ?? '').trim();
}

export function authConfiguration() {
  const origin = runtimeValue('APP_ORIGIN');
  if (!origin) throw new Error('AUTH_ORIGIN_MISSING');
  const parsed = new URL(origin);
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') throw new Error('AUTH_HTTPS_REQUIRED');
  const rpID = runtimeValue('WEBAUTHN_RP_ID') || parsed.hostname;
  if (rpID !== parsed.hostname && !parsed.hostname.endsWith(`.${rpID}`)) throw new Error('AUTH_RP_ID_INVALID');
  return {
    origin: parsed.origin,
    rpID,
    rpName: runtimeValue('WEBAUTHN_RP_NAME') || 'Expo Service AI',
  };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return bytesToBase64Url(data);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesToBase64(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function changeCount(result: { meta?: unknown } | undefined) {
  return Number(((result?.meta ?? {}) as { changes?: number }).changes ?? 0);
}

function passwordParameters(record: StoredPasswordCredential | null) {
  if (!record || record.algorithm !== 'scrypt') return null;
  const costN = Number(record.cost_n);
  const blockSize = Number(record.block_size);
  const parallelization = Number(record.parallelization);
  const keyLength = Number(record.key_length);
  const costIsValid = costN >= 16_384 && costN <= 65_536 && (costN & (costN - 1)) === 0;
  if (!costIsValid || blockSize < 8 || blockSize > 16 || parallelization < 1 || parallelization > 2
    || keyLength < 32 || keyLength > 64) return null;
  return { costN, blockSize, parallelization, keyLength };
}

function derivePassword(password: string, salt: Buffer, parameters: typeof passwordDefaults) {
  const maxmem = Math.max(64 * 1024 * 1024, 256 * parameters.costN * parameters.blockSize);
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, parameters.keyLength, {
      N: parameters.costN,
      r: parameters.blockSize,
      p: parameters.parallelization,
      maxmem,
    }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function ensureAuthTables() {
  schemaProbe ??= (async () => {
    const probes = [
      'SELECT id, email_normalized, display_name, status, email_verified_at, last_login_at, created_at, updated_at FROM auth_users LIMIT 0',
      'SELECT user_id, algorithm, cost_n, block_size, parallelization, key_length, salt_base64, hash_base64, created_at, updated_at FROM auth_password_credentials LIMIT 0',
      'SELECT id, user_id, credential_id, public_key_base64, counter, transports_json, device_type, backed_up, created_at, last_used_at FROM auth_passkeys LIMIT 0',
      'SELECT id, user_id, token_hash, csrf_token_hash, auth_level, created_at, last_seen_at, expires_at, revoked_at FROM auth_sessions LIMIT 0',
      'SELECT id, user_id, tenant_id, event_id, email_normalized, display_name, role, organization_id, place_id, code_hash, attempts, expires_at, consumed_at, consume_nonce, created_by, created_at FROM auth_activations LIMIT 0',
      'SELECT id, browser_token_hash, purpose, challenge, activation_id, expires_at, consumed_at, created_at FROM auth_challenges LIMIT 0',
      'SELECT key_hash, request_count, expires_at FROM auth_rate_limits LIMIT 0',
      'SELECT id, tenant_id, event_id, user_id, email_snapshot, display_name, role, organization_id, place_id, status, created_by, disabled_at, updated_at, created_at FROM app_memberships LIMIT 0',
      'SELECT id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at FROM app_audit LIMIT 0',
    ];
    for (const sql of probes) await env.DB.prepare(sql).all();
  })();
  return schemaProbe;
}

export async function authRateAllowed(input: string, limit: number, windowSeconds: number) {
  await ensureAuthTables();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();
  const keyHash = await sha256(input);
  await env.DB.prepare('DELETE FROM auth_rate_limits WHERE expires_at <= ?').bind(now.toISOString()).run();
  await env.DB.prepare(`INSERT INTO auth_rate_limits (key_hash, request_count, expires_at)
    VALUES (?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      request_count = CASE WHEN expires_at <= ? THEN 1 ELSE request_count + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END`)
    .bind(keyHash, expiresAt, now.toISOString(), now.toISOString()).run();
  const row = await env.DB.prepare('SELECT request_count FROM auth_rate_limits WHERE key_hash = ?')
    .bind(keyHash).first<{ request_count: number }>();
  return Number(row?.request_count ?? limit + 1) <= limit;
}

async function userForEmail(email: string) {
  return env.DB.prepare('SELECT id, status FROM auth_users WHERE email_normalized = ? LIMIT 1')
    .bind(email).first<{ id: string; status: string }>();
}

export async function createActivation(input: {
  email: string;
  displayName?: string;
  role: MembershipRole;
  organizationId?: string | null;
  placeId?: string | null;
  actorId: string;
}) {
  await ensureAuthTables();
  const email = normalizeEmail(input.email);
  if (!validEmail(email)) throw new Error('ACTIVATION_EMAIL_INVALID');
  const existing = await userForEmail(email);
  if (existing?.status === 'disabled') throw new Error('ACTIVATION_ACCOUNT_DISABLED');
  const userId = existing?.id ?? crypto.randomUUID();
  const code = randomToken(18);
  const codeHash = await sha256(code);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + activationLifetimeMs).toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE auth_activations SET consumed_at = ?
      WHERE event_id = ? AND email_normalized = ? AND role = ? AND consumed_at IS NULL`)
      .bind(now, venue.eventId, email, input.role),
    env.DB.prepare(`INSERT INTO auth_activations
      (id, user_id, tenant_id, event_id, email_normalized, display_name, role, organization_id, place_id,
        code_hash, attempts, expires_at, consumed_at, consume_nonce, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, NULL, ?, ?)`)
      .bind(id, userId, tenantId, venue.eventId, email, input.displayName?.trim() || email.split('@')[0],
        input.role, input.organizationId ?? null, input.placeId ?? null, codeHash, expiresAt, input.actorId, now),
    env.DB.prepare(`INSERT INTO app_audit
      (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
      VALUES (?, ?, ?, ?, 'member_activation_created', ?, ?, ?)`)
      .bind(crypto.randomUUID(), tenantId, venue.eventId, input.actorId, `activation:${id}`,
        JSON.stringify({ changed_fields: ['members'] }), now),
  ]);
  return { id, code, expiresAt, email };
}

export async function createBootstrapActivation(input: {
  email: string;
  displayName: string;
  codeHash: string;
}) {
  await ensureAuthTables();
  const email = normalizeEmail(input.email);
  if (!validEmail(email) || !/^[a-f0-9]{64}$/.test(input.codeHash)) throw new Error('BOOTSTRAP_INPUT_INVALID');
  const current = await env.DB.prepare(`SELECT COUNT(*) AS total FROM app_memberships
    WHERE tenant_id = ? AND event_id = ? AND role = 'venue_admin' AND status = 'active'`)
    .bind(tenantId, venue.eventId).first<{ total: number }>();
  if (Number(current?.total ?? 0) > 0) throw new Error('BOOTSTRAP_CLOSED');
  const existing = await userForEmail(email);
  if (existing?.status === 'disabled') throw new Error('ACTIVATION_ACCOUNT_DISABLED');
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const userId = existing?.id ?? crypto.randomUUID();
  const expiresAt = new Date(Date.now() + activationLifetimeMs).toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE auth_activations SET consumed_at = ?
      WHERE event_id = ? AND role = 'venue_admin' AND consumed_at IS NULL`).bind(now, venue.eventId),
    env.DB.prepare(`INSERT INTO auth_activations
      (id, user_id, tenant_id, event_id, email_normalized, display_name, role, organization_id, place_id,
        code_hash, attempts, expires_at, consumed_at, consume_nonce, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'venue_admin', NULL, NULL, ?, 0, ?, NULL, NULL, 'system:bootstrap', ?)`)
      .bind(id, userId, tenantId, venue.eventId, email, input.displayName.trim() || email.split('@')[0], input.codeHash, expiresAt, now),
  ]);
  return { id, expiresAt };
}

async function activationForCode(emailValue: string, code: string) {
  await ensureAuthTables();
  const email = normalizeEmail(emailValue);
  const now = new Date().toISOString();
  const activation = await env.DB.prepare(`SELECT id, user_id, tenant_id, event_id, email_normalized,
      display_name, role, organization_id, place_id, expires_at, code_hash, attempts
    FROM auth_activations
    WHERE event_id = ? AND email_normalized = ? AND consumed_at IS NULL
    ORDER BY created_at DESC LIMIT 1`)
    .bind(venue.eventId, email).first<ActivationRecord & { code_hash: string; attempts: number }>();
  if (!activation || activation.expires_at <= now || activation.attempts >= activationAttemptLimit) return null;
  await env.DB.prepare('UPDATE auth_activations SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL')
    .bind(activation.id).run();
  return activation.code_hash === await sha256(code.trim()) ? activation : null;
}

async function saveChallenge(purpose: StoredChallenge['purpose'], challenge: string, activationId?: string) {
  await ensureAuthTables();
  const browserToken = randomToken();
  const browserTokenHash = await sha256(browserToken);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + challengeLifetimeMs).toISOString();
  await env.DB.prepare(`INSERT INTO auth_challenges
    (id, browser_token_hash, purpose, challenge, activation_id, expires_at, consumed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`)
    .bind(crypto.randomUUID(), browserTokenHash, purpose, challenge, activationId ?? null, expiresAt, now).run();
  return browserToken;
}

async function challengeForBrowserToken(browserToken: string, purpose: StoredChallenge['purpose']) {
  if (!browserToken) return null;
  await ensureAuthTables();
  return env.DB.prepare(`SELECT id, purpose, challenge, activation_id, expires_at
    FROM auth_challenges WHERE browser_token_hash = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > ? LIMIT 1`)
    .bind(await sha256(browserToken), purpose, new Date().toISOString()).first<StoredChallenge>();
}

async function consumeChallenge(id: string) {
  const result = await env.DB.prepare(`UPDATE auth_challenges SET consumed_at = ?
    WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`)
    .bind(new Date().toISOString(), id, new Date().toISOString()).run();
  return changeCount(result) === 1;
}

export async function registrationOptions(email: string, code: string) {
  const activation = await activationForCode(email, code);
  if (!activation) return null;
  const { rpID, rpName } = authConfiguration();
  const existing = await env.DB.prepare('SELECT credential_id, transports_json FROM auth_passkeys WHERE user_id = ?')
    .bind(activation.user_id).all<{ credential_id: string; transports_json: string }>();
  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userID: new TextEncoder().encode(activation.user_id),
    userName: activation.email_normalized,
    userDisplayName: activation.display_name,
    attestationType: 'none',
    excludeCredentials: existing.results.map((item) => ({
      id: item.credential_id,
      transports: safeTransports(item.transports_json),
    })),
    authenticatorSelection: {
      residentKey: 'required',
      requireResidentKey: true,
      userVerification: 'required',
    },
  });
  const browserToken = await saveChallenge('activation', options.challenge, activation.id);
  return { options, browserToken };
}

export async function loginOptions() {
  const { rpID } = authConfiguration();
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' });
  const browserToken = await saveChallenge('login', options.challenge);
  return { options, browserToken };
}

function safeTransports(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is 'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb' =>
      ['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb'].includes(String(item))) : undefined;
  } catch {
    return undefined;
  }
}

export async function completeActivation(browserToken: string, response: RegistrationResponse) {
  const challenge = await challengeForBrowserToken(browserToken, 'activation');
  if (!challenge?.activation_id) return null;
  const activation = await env.DB.prepare(`SELECT id, user_id, tenant_id, event_id, email_normalized,
      display_name, role, organization_id, place_id, expires_at
    FROM auth_activations WHERE id = ? AND consumed_at IS NULL AND expires_at > ? LIMIT 1`)
    .bind(challenge.activation_id, new Date().toISOString()).first<ActivationRecord>();
  if (!activation) return null;
  const { origin, rpID } = authConfiguration();
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) return null;
  if (!await consumeChallenge(challenge.id)) return null;
  const now = new Date().toISOString();
  const consumeNonce = crypto.randomUUID();
  const credential = verification.registrationInfo.credential;
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE auth_activations SET consumed_at = ?, consume_nonce = ?
      WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`)
      .bind(now, consumeNonce, activation.id, now),
    env.DB.prepare(`INSERT INTO auth_users
      (id, email_normalized, display_name, status, email_verified_at, last_login_at, created_at, updated_at)
      SELECT user_id, email_normalized, display_name, 'active', ?, ?, ?, ?
      FROM auth_activations WHERE id = ? AND consume_nonce = ?
      ON CONFLICT(email_normalized) DO UPDATE SET
        display_name = excluded.display_name, email_verified_at = excluded.email_verified_at,
        last_login_at = excluded.last_login_at, updated_at = excluded.updated_at`)
      .bind(now, now, now, now, activation.id, consumeNonce),
    env.DB.prepare(`INSERT INTO auth_passkeys
      (id, user_id, credential_id, public_key_base64, counter, transports_json, device_type, backed_up, created_at, last_used_at)
      SELECT ?, user_id, ?, ?, ?, ?, ?, ?, ?, ? FROM auth_activations WHERE id = ? AND consume_nonce = ?`)
      .bind(crypto.randomUUID(), credential.id, bytesToBase64(credential.publicKey), credential.counter,
        JSON.stringify(credential.transports ?? []), verification.registrationInfo.credentialDeviceType,
        verification.registrationInfo.credentialBackedUp ? 1 : 0, now, now, activation.id, consumeNonce),
    env.DB.prepare(`INSERT INTO app_memberships
      (id, tenant_id, event_id, user_id, email_snapshot, display_name, role, organization_id, place_id,
        status, created_by, disabled_at, updated_at, created_at)
      SELECT ?, tenant_id, event_id, user_id, email_normalized, display_name, role, organization_id, place_id,
        'active', created_by, NULL, ?, ? FROM auth_activations WHERE id = ? AND consume_nonce = ?
      ON CONFLICT(event_id, role, user_id) DO UPDATE SET
        organization_id = excluded.organization_id, place_id = excluded.place_id, status = 'active',
        disabled_at = NULL, updated_at = excluded.updated_at`)
      .bind(crypto.randomUUID(), now, now, activation.id, consumeNonce),
    env.DB.prepare(`INSERT INTO app_audit
      (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
      SELECT ?, tenant_id, event_id, user_id, 'member_activated', ?, ?, ?
      FROM auth_activations WHERE id = ? AND consume_nonce = ?`)
      .bind(crypto.randomUUID(), `membership:${activation.event_id}:${activation.role}`,
        JSON.stringify({ changed_fields: ['members'] }), now, activation.id, consumeNonce),
  ]);
  if (changeCount(results[0]) !== 1) return null;
  return { ...await createSession(activation.user_id, 2), role: activation.role };
}

export async function completeLogin(browserToken: string, response: AuthenticationResponse) {
  const challenge = await challengeForBrowserToken(browserToken, 'login');
  if (!challenge) return null;
  const passkey = await env.DB.prepare(`SELECT id, user_id, credential_id, public_key_base64, counter, transports_json
    FROM auth_passkeys WHERE credential_id = ? LIMIT 1`).bind(response.id).first<StoredPasskey>();
  if (!passkey) return null;
  const user = await env.DB.prepare('SELECT status FROM auth_users WHERE id = ? LIMIT 1')
    .bind(passkey.user_id).first<{ status: string }>();
  if (user?.status !== 'active') return null;
  const { origin, rpID } = authConfiguration();
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: passkey.credential_id,
      publicKey: base64ToBytes(passkey.public_key_base64),
      counter: passkey.counter,
      transports: safeTransports(passkey.transports_json),
    },
  });
  if (!verification.verified || !await consumeChallenge(challenge.id)) return null;
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE auth_passkeys SET counter = ?, last_used_at = ? WHERE id = ?')
      .bind(verification.authenticationInfo.newCounter, now, passkey.id),
    env.DB.prepare('UPDATE auth_users SET last_login_at = ?, updated_at = ? WHERE id = ? AND status = \'active\'')
      .bind(now, now, passkey.user_id),
    env.DB.prepare(`INSERT INTO app_audit
      (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
      VALUES (?, ?, ?, ?, 'auth_login_succeeded', ?, ?, ?)`)
      .bind(crypto.randomUUID(), tenantId, venue.eventId, passkey.user_id,
        `user:${passkey.user_id}`, JSON.stringify({ changed_fields: ['last_login_at'] }), now),
  ]);
  return createSession(passkey.user_id, 2);
}

export async function completePasswordLogin(emailValue: string, passwordValue: string) {
  await ensureAuthTables();
  const email = normalizeEmail(emailValue).slice(0, 254);
  const password = String(passwordValue);
  const record = validEmail(email)
    ? await env.DB.prepare(`SELECT p.user_id, u.status, p.algorithm, p.cost_n, p.block_size,
        p.parallelization, p.key_length, p.salt_base64, p.hash_base64
      FROM auth_password_credentials p JOIN auth_users u ON u.id = p.user_id
      WHERE u.email_normalized = ? LIMIT 1`)
      .bind(email).first<StoredPasswordCredential>()
    : null;
  const storedParameters = passwordParameters(record);
  const parameters = storedParameters ?? passwordDefaults;
  let salt = dummyPasswordSalt;
  let expected = dummyPasswordHash;
  if (record && storedParameters) {
    try {
      salt = Buffer.from(record.salt_base64, 'base64');
      expected = Buffer.from(record.hash_base64, 'base64');
    } catch {
      salt = dummyPasswordSalt;
      expected = dummyPasswordHash;
    }
  }
  const derived = await derivePassword(password.slice(0, passwordMaximumLength), salt, parameters);
  const passwordMatches = derived.length === expected.length && timingSafeEqual(derived, expected);
  if (!record || !storedParameters || record.status !== 'active'
    || password.length < passwordMinimumLength || password.length > passwordMaximumLength || !passwordMatches) {
    return null;
  }

  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE auth_users SET last_login_at = ?, updated_at = ? WHERE id = ? AND status = \'active\'')
      .bind(now, now, record.user_id),
    env.DB.prepare(`INSERT INTO app_audit
      (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
      VALUES (?, ?, ?, ?, 'auth_password_login_succeeded', ?, ?, ?)`)
      .bind(crypto.randomUUID(), tenantId, venue.eventId, record.user_id,
        `user:${record.user_id}`, JSON.stringify({ changed_fields: ['last_login_at'] }), now),
  ]);
  return createSession(record.user_id, 1);
}

async function createSession(userId: string, authLevel: number) {
  await ensureAuthTables();
  const token = randomToken();
  const csrfToken = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionLifetimeMs).toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO auth_sessions
    (id, user_id, token_hash, csrf_token_hash, auth_level, created_at, last_seen_at, expires_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`)
    .bind(id, userId, await sha256(token), await sha256(csrfToken), authLevel,
      now.toISOString(), now.toISOString(), expiresAt).run();
  return { token, csrfToken, expiresAt };
}

export async function sessionForToken(token: string) {
  if (!token) return null;
  await ensureAuthTables();
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - sessionIdleLifetimeMs).toISOString();
  const row = await env.DB.prepare(`SELECT s.id, s.csrf_token_hash, s.auth_level, s.expires_at, s.last_seen_at,
      u.id AS user_id, u.email_normalized, u.display_name
    FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
      AND s.last_seen_at > ? AND u.status = 'active' LIMIT 1`)
    .bind(await sha256(token), now.toISOString(), idleCutoff).first<{
      id: string;
      csrf_token_hash: string;
      auth_level: number;
      expires_at: string;
      last_seen_at: string;
      user_id: string;
      email_normalized: string;
      display_name: string;
    }>();
  if (!row) return null;
  if (now.getTime() - new Date(row.last_seen_at).getTime() > 5 * 60 * 1000) {
    await env.DB.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ? AND revoked_at IS NULL')
      .bind(now.toISOString(), row.id).run();
  }
  return {
    id: row.id,
    user: { userId: row.user_id, email: row.email_normalized, displayName: row.display_name },
    csrfTokenHash: row.csrf_token_hash,
    authLevel: row.auth_level,
    expiresAt: row.expires_at,
  } satisfies AuthSession;
}

export async function revokeSession(token: string, actorId?: string) {
  if (!token) return;
  await ensureAuthTables();
  const now = new Date().toISOString();
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare('SELECT id, user_id FROM auth_sessions WHERE token_hash = ? LIMIT 1')
    .bind(tokenHash).first<{ id: string; user_id: string }>();
  await env.DB.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL')
    .bind(now, tokenHash).run();
  if (row) {
    await env.DB.prepare(`INSERT INTO app_audit
      (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
      VALUES (?, ?, ?, ?, 'auth_logout', ?, ?, ?)`)
      .bind(crypto.randomUUID(), tenantId, venue.eventId, actorId ?? row.user_id,
        `session:${row.id}`, JSON.stringify({ changed_fields: ['session'] }), now).run();
  }
}

export async function revokeAllSessions(userId: string) {
  await ensureAuthTables();
  await env.DB.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .bind(new Date().toISOString(), userId).run();
}

export async function csrfMatches(session: AuthSession, value: string) {
  if (!value) return false;
  const actual = Buffer.from(await sha256(value), 'hex');
  const expected = Buffer.from(session.csrfTokenHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function bootstrapSecret() {
  const value = runtimeValue('AUTH_BOOTSTRAP_SECRET');
  return value.startsWith('replace-with-') ? '' : value;
}
