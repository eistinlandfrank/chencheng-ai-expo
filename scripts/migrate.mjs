import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const configuredPath = process.env.DATABASE_PATH?.trim();
if (!configuredPath) throw new Error('DATABASE_PATH is required');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = resolve(configuredPath);
mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath, {
  timeout: 5_000,
  enableForeignKeyConstraints: true,
});

database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  PRAGMA foreign_keys = ON;
  PRAGMA wal_autocheckpoint = 1000;
  CREATE TABLE IF NOT EXISTS app_schema_migrations (
    name TEXT PRIMARY KEY,
    sha256 TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );
`);

const journal = JSON.parse(
  readFileSync(join(root, 'drizzle/meta/_journal.json'), 'utf8'),
);

for (const entry of journal.entries) {
  const name = String(entry.tag);
  const migrationPath = join(root, 'drizzle', `${name}.sql`);
  const sql = readFileSync(migrationPath, 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  let appliedNow = false;

  database.exec('BEGIN IMMEDIATE');
  try {
    const applied = database
      .prepare('SELECT sha256 FROM app_schema_migrations WHERE name = ?')
      .get(name);
    if (applied && applied.sha256 !== checksum) {
      throw new Error(`Migration checksum mismatch: ${name}`);
    }
    if (!applied) {
      database.exec(sql);
      database
        .prepare(
          'INSERT INTO app_schema_migrations (name, sha256, applied_at) VALUES (?, ?, ?)',
        )
        .run(name, checksum, new Date().toISOString());
      appliedNow = true;
    }
    database.exec('COMMIT');
    if (appliedNow) process.stdout.write(`Applied ${name}\n`);
  } catch (error) {
    try {
      database.exec('ROLLBACK');
    } catch {
      // Preserve the original migration error.
    }
    throw error;
  }
}

const quickCheck = database.prepare('PRAGMA quick_check').get();
if (!quickCheck || !Object.values(quickCheck).includes('ok')) {
  throw new Error('SQLite quick_check failed');
}
const foreignKeyErrors = database.prepare('PRAGMA foreign_key_check').all();
if (foreignKeyErrors.length > 0) {
  throw new Error('SQLite foreign_key_check failed');
}

database.exec('PRAGMA wal_checkpoint(PASSIVE)');
database.close();
process.stdout.write('Database is ready\n');
