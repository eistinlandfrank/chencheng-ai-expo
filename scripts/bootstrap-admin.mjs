import { createHash, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? '').trim() : '';
}

const secret = String(process.env.AUTH_BOOTSTRAP_SECRET ?? '').trim();
if (secret.length < 32) {
  console.error('AUTH_BOOTSTRAP_SECRET must be configured with at least 32 random characters.');
  process.exit(1);
}

const prompt = createInterface({ input, output });
let email = argument('--email');
let displayName = argument('--name');
if (!email) email = (await prompt.question('Administrator email: ')).trim().toLowerCase();
if (!displayName) displayName = (await prompt.question('Display name: ')).trim();
prompt.close();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Enter a valid email address.');
  process.exit(1);
}

const activationCode = randomBytes(18).toString('base64url');
const codeHash = createHash('sha256').update(activationCode).digest('hex');
const internalOrigin = String(process.env.EXPO_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const publicOrigin = String(process.env.APP_ORIGIN ?? internalOrigin).replace(/\/$/, '');

let response;
try {
  response = await fetch(`${internalOrigin}/api/v1/auth/bootstrap`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-expo-bootstrap-secret': secret,
    },
    body: JSON.stringify({ email, display_name: displayName, code_hash: codeHash }),
  });
} catch {
  console.error(`Unable to reach ${internalOrigin}. Start the application or set EXPO_INTERNAL_ORIGIN.`);
  process.exit(1);
}

if (!response.ok) {
  const payload = await response.json().catch(() => ({}));
  if (payload.code === 'BOOTSTRAP_CLOSED') console.error('A venue administrator already exists. Bootstrap is closed.');
  else console.error('Unable to create the initial administrator activation.');
  process.exit(1);
}

const payload = await response.json();
console.log('\nInitial administrator activation created.');
console.log(`Open: ${publicOrigin}/activate`);
console.log(`Email: ${email}`);
console.log(`Activation code: ${activationCode}`);
console.log(`Expires: ${payload.expires_at}`);
console.log('\nThe activation code is shown once. Send it only through a trusted channel.');
