import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? '').trim() : '';
}

const email = argument('--email').toLowerCase();
const generate = process.argv.includes('--generate');
const databasePath = resolve(String(process.env.DATABASE_PATH ?? ''));

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
if (!generate) throw new Error('Use --generate so plaintext passwords are never passed on the command line.');
if (!process.env.DATABASE_PATH) throw new Error('DATABASE_PATH is required.');

const password = randomBytes(18).toString('base64url');
const parameters = { costN: 32_768, blockSize: 8, parallelization: 1, keyLength: 64 };
const salt = randomBytes(24);
const hash = scryptSync(password, salt, parameters.keyLength, {
  N: parameters.costN,
  r: parameters.blockSize,
  p: parameters.parallelization,
  maxmem: 64 * 1024 * 1024,
});
const database = new DatabaseSync(databasePath, {
  timeout: 5_000,
  enableForeignKeyConstraints: true,
});

const user = database.prepare(`SELECT u.id, m.tenant_id, m.event_id
  FROM auth_users u JOIN app_memberships m ON m.user_id = u.id
  WHERE u.email_normalized = ? AND u.status = 'active' AND m.status = 'active'
  ORDER BY CASE WHEN m.role = 'venue_admin' THEN 0 ELSE 1 END LIMIT 1`).get(email);
if (!user) {
  database.close();
  throw new Error('Active account not found.');
}

const now = new Date().toISOString();
database.exec('BEGIN IMMEDIATE');
try {
  database.prepare(`INSERT INTO auth_password_credentials
    (user_id, algorithm, cost_n, block_size, parallelization, key_length,
      salt_base64, hash_base64, created_at, updated_at)
    VALUES (?, 'scrypt', ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      algorithm = excluded.algorithm,
      cost_n = excluded.cost_n,
      block_size = excluded.block_size,
      parallelization = excluded.parallelization,
      key_length = excluded.key_length,
      salt_base64 = excluded.salt_base64,
      hash_base64 = excluded.hash_base64,
      updated_at = excluded.updated_at`).run(
        user.id,
        parameters.costN,
        parameters.blockSize,
        parameters.parallelization,
        parameters.keyLength,
        salt.toString('base64'),
        hash.toString('base64'),
        now,
        now,
      );
  database.prepare(`INSERT INTO app_audit
    (id, tenant_id, event_id, actor_id, action, resource_key, after_json, created_at)
    VALUES (?, ?, ?, ?, 'auth_password_set', ?, ?, ?)`).run(
      randomUUID(), user.tenant_id, user.event_id, 'system:password-provision',
      `user:${user.id}`, JSON.stringify({ changed_fields: ['password_credential'] }), now,
    );
  database.exec('COMMIT');
} catch (error) {
  database.exec('ROLLBACK');
  database.close();
  throw error;
}
database.close();

console.log(JSON.stringify({ email, password }));
