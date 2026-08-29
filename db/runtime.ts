import 'server-only';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';

export type SqlValue = string | number | bigint | null | Uint8Array;

export type SqlMeta = {
  changes: number;
  last_row_id: number;
};

export type SqlResult<T = Record<string, unknown>> = {
  success: true;
  results: T[];
  meta: SqlMeta;
};

export interface SqlPreparedStatement {
  bind(...values: unknown[]): SqlPreparedStatement;
  first<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T | null>;
  all<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<SqlResult<T>>;
}

export interface SqlDatabase {
  prepare(sql: string): SqlPreparedStatement;
  batch<T extends Record<string, unknown> = Record<string, unknown>>(
    statements: SqlPreparedStatement[],
  ): Promise<SqlResult<T>[]>;
}

function databasePath() {
  const configured = process.env.DATABASE_PATH?.trim();
  if (!configured) {
    throw new Error('DATABASE_PATH is required');
  }
  return resolve(configured);
}

function sqlValue(value: unknown): SqlValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  throw new TypeError('Unsupported SQLite binding value');
}

function hasResultColumns(statement: StatementSync, sql: string) {
  const columns = (statement as StatementSync & {
    columns?: () => unknown[];
  }).columns;
  if (typeof columns === 'function') return columns.call(statement).length > 0;
  return /^(?:SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(sql.trimStart());
}

function numeric(value: number | bigint | undefined) {
  return typeof value === 'bigint' ? Number(value) : Number(value ?? 0);
}

class PreparedStatement implements SqlPreparedStatement {
  constructor(
    readonly sql: string,
    readonly values: SqlValue[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new PreparedStatement(this.sql, values.map(sqlValue));
  }

  async first<T extends Record<string, unknown>>() {
    const row = getNativeDatabase().prepare(this.sql).get(...this.values);
    return (row ?? null) as T | null;
  }

  async all<T extends Record<string, unknown>>() {
    const rows = getNativeDatabase().prepare(this.sql).all(...this.values);
    return { results: rows as T[] };
  }

  async run<T extends Record<string, unknown>>() {
    return executeStatement<T>(getNativeDatabase(), this);
  }
}

function executeStatement<T extends Record<string, unknown>>(
  database: DatabaseSync,
  statement: PreparedStatement,
): SqlResult<T> {
  const native = database.prepare(statement.sql);
  if (hasResultColumns(native, statement.sql)) {
    return {
      success: true,
      results: native.all(...statement.values) as T[],
      meta: { changes: 0, last_row_id: 0 },
    };
  }
  const result = native.run(...statement.values);
  return {
    success: true,
    results: [],
    meta: {
      changes: numeric(result.changes),
      last_row_id: numeric(result.lastInsertRowid),
    },
  };
}

class RuntimeDatabase implements SqlDatabase {
  prepare(sql: string) {
    return new PreparedStatement(sql);
  }

  async batch<T extends Record<string, unknown>>(statements: SqlPreparedStatement[]) {
    const database = getNativeDatabase();
    database.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map((statement) => {
        if (!(statement instanceof PreparedStatement)) {
          throw new TypeError('Statement belongs to another database adapter');
        }
        return executeStatement<T>(database, statement);
      });
      database.exec('COMMIT');
      return results;
    } catch (error) {
      try {
        database.exec('ROLLBACK');
      } catch {
        // Preserve the original database error.
      }
      throw error;
    }
  }
}

type RuntimeStore = {
  database: DatabaseSync | null;
  exitHandlerRegistered: boolean;
};

const runtimeGlobal = globalThis as typeof globalThis & {
  __expoServiceSqlite?: RuntimeStore;
};
const runtimeStore = runtimeGlobal.__expoServiceSqlite ??= {
  database: null,
  exitHandlerRegistered: false,
};
const runtimeDatabase = new RuntimeDatabase();

function getNativeDatabase() {
  if (runtimeStore.database) return runtimeStore.database;
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  runtimeStore.database = new DatabaseSync(path, {
    timeout: 5_000,
    enableForeignKeyConstraints: true,
  });
  runtimeStore.database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    PRAGMA wal_autocheckpoint = 1000;
  `);
  return runtimeStore.database;
}

export const env = {
  get DB(): SqlDatabase {
    getNativeDatabase();
    return runtimeDatabase;
  },
};

if (!runtimeStore.exitHandlerRegistered) {
  runtimeStore.exitHandlerRegistered = true;
  process.once('exit', () => {
    if (!runtimeStore.database) return;
    const database = runtimeStore.database;
    runtimeStore.database = null;
    try {
      database.exec('PRAGMA wal_checkpoint(PASSIVE)');
    } catch {
      // WAL recovery remains safe if a final passive checkpoint is unavailable.
    }
    try {
      database.close();
    } catch {
      // Process shutdown must not mask the original exit reason.
    }
  });
}
