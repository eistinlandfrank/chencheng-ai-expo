import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, open, rename } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const port = Number(process.env.PORT ?? '3000');
const secret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
const repository = process.env.GITHUB_REPOSITORY ?? '';
const queueDir = process.env.QUEUE_DIR ?? '/queue';
const webhookPath = process.env.WEBHOOK_PATH ?? '/webhooks/github';
const maxBodyBytes = 1024 * 1024;

if (!secret || secret.length < 32) throw new Error('GITHUB_WEBHOOK_SECRET must contain at least 32 characters');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY must be owner/name');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT is invalid');

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

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/healthz') {
      return reply(response, 200, { ok: true });
    }
    if (request.method !== 'POST' || request.url !== webhookPath) {
      return reply(response, 404, { ok: false });
    }

    const rawBody = await readBody(request);
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
    return reply(response, 400, { ok: false });
  }
});

server.requestTimeout = 10_000;
server.headersTimeout = 12_000;
server.listen(port, '0.0.0.0');
