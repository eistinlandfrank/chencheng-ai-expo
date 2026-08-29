import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
} from 'node:crypto';
import { mkdir, open, rename } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const port = Number(process.env.PORT ?? '3000');
const listenHost = process.env.LISTEN_HOST ?? '127.0.0.1';
const secret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
const repository = process.env.GITHUB_REPOSITORY ?? '';
const queueDir = process.env.QUEUE_DIR ?? '/queue';
const webhookPath = process.env.WEBHOOK_PATH ?? '/webhooks/github';
const actionsWebhookPath = `${webhookPath}/actions`;
const maxBodyBytes = 1024 * 1024;
const maximumTokenBytes = 16 * 1024;
const oidcIssuer = 'https://token.actions.githubusercontent.com';
const oidcJwksUrl = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const oidcAudience = process.env.GITHUB_ACTIONS_OIDC_AUDIENCE
  ?? `https://chencheng-expo.pages.dev${actionsWebhookPath}`;

if (!secret || secret.length < 32) throw new Error('GITHUB_WEBHOOK_SECRET must contain at least 32 characters');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY must be owner/name');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT is invalid');
if (listenHost !== '127.0.0.1' && listenHost !== '::1') throw new Error('LISTEN_HOST must be loopback');

const oidcWorkflowRef = `${repository}/.github/workflows/deploy-server.yml@refs/heads/main`;
const legacyOidcSubject = `repo:${repository}:ref:refs/heads/main`;
const [repositoryOwner, repositoryName] = repository.split('/');
const immutableOidcSubject = new RegExp(
  `^repo:${repositoryOwner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@[0-9]+/`
    + `${repositoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@[0-9]+:ref:refs/heads/main$`,
  'i',
);
let cachedJwks = null;
let cachedJwksExpiresAt = 0;

await mkdir(queueDir, { recursive: true });

function reply(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function signatureIsValid(rawBody, suppliedSignature) {
  if (!/^sha256=[0-9a-f]{64}$/.test(suppliedSignature)) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const supplied = Buffer.from(suppliedSignature, 'utf8');
  const calculated = Buffer.from(expected, 'utf8');
  return supplied.length === calculated.length && timingSafeEqual(supplied, calculated);
}

function decodeJwtJson(segment) {
  const decoded = Buffer.from(segment, 'base64url');
  if (decoded.length === 0 || decoded.length > maximumTokenBytes) throw new Error('OIDC_INVALID');
  return JSON.parse(decoded.toString('utf8'));
}

async function oidcKeys() {
  if (cachedJwks && Date.now() < cachedJwksExpiresAt) return cachedJwks;
  const response = await fetch(oidcJwksUrl, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error('OIDC_UNAVAILABLE');
  const payload = await response.json();
  if (!Array.isArray(payload?.keys) || payload.keys.length === 0) throw new Error('OIDC_UNAVAILABLE');
  cachedJwks = payload.keys;
  cachedJwksExpiresAt = Date.now() + (10 * 60 * 1000);
  return cachedJwks;
}

function audienceIncludes(audience, expected) {
  if (typeof audience === 'string') return audience === expected;
  return Array.isArray(audience) && audience.includes(expected);
}

function oidcSubjectMatches(subject) {
  return subject === legacyOidcSubject
    || (typeof subject === 'string' && immutableOidcSubject.test(subject));
}

function matchingOidcKey(keys, kid) {
  return keys.find((candidate) => candidate?.kid === kid
    && candidate?.kty === 'RSA'
    && candidate?.alg === 'RS256'
    && (candidate?.use === undefined || candidate.use === 'sig'));
}

async function verifiedActionsClaims(request) {
  const authorization = String(request.headers.authorization ?? '');
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(authorization);
  if (!match || Buffer.byteLength(match[1]) > maximumTokenBytes) throw new Error('OIDC_INVALID');

  const token = match[1];
  const segments = token.split('.');
  if (segments.length !== 3 || segments.some((segment) => segment.length === 0)) {
    throw new Error('OIDC_INVALID');
  }

  const header = decodeJwtJson(segments[0]);
  const claims = decodeJwtJson(segments[1]);
  if (header?.alg !== 'RS256' || typeof header?.kid !== 'string' || header.kid.length > 256) {
    throw new Error('OIDC_INVALID');
  }

  const key = matchingOidcKey(await oidcKeys(), header.kid);
  if (!key) {
    cachedJwks = null;
    cachedJwksExpiresAt = 0;
    const refreshedKey = matchingOidcKey(await oidcKeys(), header.kid);
    if (!refreshedKey) throw new Error('OIDC_INVALID');
    if (!verifySignature(
      'RSA-SHA256',
      Buffer.from(`${segments[0]}.${segments[1]}`),
      createPublicKey({ key: refreshedKey, format: 'jwk' }),
      Buffer.from(segments[2], 'base64url'),
    )) throw new Error('OIDC_INVALID');
  } else if (!verifySignature(
    'RSA-SHA256',
    Buffer.from(`${segments[0]}.${segments[1]}`),
    createPublicKey({ key, format: 'jwk' }),
    Buffer.from(segments[2], 'base64url'),
  )) {
    throw new Error('OIDC_INVALID');
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims?.iss !== oidcIssuer
    || !audienceIncludes(claims?.aud, oidcAudience)
    || !Number.isInteger(claims?.iat)
    || !Number.isInteger(claims?.exp)
    || claims.iat < now - 10 * 60
    || claims.iat > now + 30
    || claims.exp < now - 30
    || claims.exp > now + 15 * 60
    || (claims.nbf !== undefined && (!Number.isInteger(claims.nbf) || claims.nbf > now + 30))
    || !oidcSubjectMatches(claims?.sub)
    || claims?.repository !== repository
    || claims?.repository_owner !== repositoryOwner
    || claims?.ref !== 'refs/heads/main'
    || claims?.event_name !== 'push'
    || claims?.workflow_ref !== oidcWorkflowRef
    || !/^[0-9a-f]{40}$/.test(String(claims?.sha ?? '').toLowerCase())) {
    throw new Error('OIDC_INVALID');
  }
  return claims;
}

async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBodyBytes) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function enqueue(payload, delivery) {
  const filename = `${Date.now()}-${delivery}.json`;
  const target = path.join(queueDir, filename);
  const temporary = `${target}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(payload)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, target);
}

async function handleActionsWebhook(request, response, rawBody) {
  const claims = await verifiedActionsClaims(request);
  const delivery = String(request.headers['x-github-delivery'] ?? '');
  if (!/^[0-9a-f-]{16,64}$/i.test(delivery)) return reply(response, 400, { ok: false });

  const payload = JSON.parse(rawBody.toString('utf8'));
  const commit = String(payload?.commit ?? '').toLowerCase();
  if (payload?.repository !== repository
    || payload?.ref !== 'refs/heads/main'
    || commit !== String(claims.sha).toLowerCase()
    || !/^[0-9a-f]{40}$/.test(commit)
    || /^0{40}$/.test(commit)) {
    return reply(response, 403, { ok: false });
  }

  await enqueue({
    commit,
    delivery,
    repository,
    source: 'github-actions-oidc',
    receivedAt: new Date().toISOString(),
  }, delivery);
  return reply(response, 202, { ok: true, queued: true });
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/healthz') {
      return reply(response, 200, { ok: true });
    }
    if (request.method !== 'POST'
      || (request.url !== webhookPath && request.url !== actionsWebhookPath)) {
      return reply(response, 404, { ok: false });
    }

    const rawBody = await readBody(request);
    if (request.url === actionsWebhookPath) {
      return await handleActionsWebhook(request, response, rawBody);
    }

    const suppliedSignature = String(request.headers['x-hub-signature-256'] ?? '');
    if (!signatureIsValid(rawBody, suppliedSignature)) {
      return reply(response, 401, { ok: false });
    }

    const event = String(request.headers['x-github-event'] ?? '');
    const delivery = String(request.headers['x-github-delivery'] ?? '');
    if (!/^[0-9a-f-]{16,64}$/i.test(delivery)) {
      return reply(response, 400, { ok: false });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    if (payload?.repository?.full_name !== repository) {
      return reply(response, 403, { ok: false });
    }
    if (event === 'ping') return reply(response, 200, { ok: true, event: 'ping' });
    if (event !== 'push' || payload?.ref !== 'refs/heads/main' || payload?.deleted === true) {
      return reply(response, 202, { ok: true, queued: false });
    }

    const commit = String(payload?.after ?? '').toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(commit) || /^0{40}$/.test(commit)) {
      return reply(response, 400, { ok: false });
    }

    await enqueue({
      commit,
      delivery,
      repository,
      receivedAt: new Date().toISOString(),
    }, delivery);
    return reply(response, 202, { ok: true, queued: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return reply(response, 413, { ok: false });
    }
    if (error instanceof Error && error.message === 'OIDC_UNAVAILABLE') {
      return reply(response, 503, { ok: false });
    }
    if (error instanceof Error && error.message === 'OIDC_INVALID') {
      return reply(response, 401, { ok: false });
    }
    return reply(response, 400, { ok: false });
  }
});

server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.listen(port, listenHost);
