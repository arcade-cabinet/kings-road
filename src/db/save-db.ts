/**
 * SQLite adapter for save data.
 *
 * Web: sql.js (wasm served from public/sql-wasm.wasm — copied at build time
 * by scripts/copy-runtime-assets.ts). No DOM component required; eliminates
 * the jeep-sqlite wasm ABI incompatibility introduced in v2.8.
 *
 * Native: @capacitor-community/sqlite via CapacitorSQLite. Unchanged.
 *
 * Public API: sqlRun / sqlQuery / closeDb — same contract as before so
 * save-service.ts needs no edits.
 *
 * Why sql.js on web instead of jeep-sqlite:
 *   jeep-sqlite 2.8 bundles a wasm binary compiled against @stencil/core 4.15;
 *   running under 4.20 triggers LinkError: Import #34 "a" "I": function import
 *   requires a callable. sql.js is already a project dependency (see
 *   copy-runtime-assets.ts) and matches CLAUDE.md's documented stack.
 */

import { Capacitor } from '@capacitor/core';

const DB_NAME = 'kings-road-saves';
const DB_VERSION = 1;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS save_slots (
     slotId INTEGER PRIMARY KEY,
     payload TEXT NOT NULL
   );`,
];

// ---------------------------------------------------------------------------
// Web path — sql.js
// ---------------------------------------------------------------------------

type SqlJsDatabase = import('sql.js').Database;

let webDb: SqlJsDatabase | null = null;
let webDbPromise: Promise<SqlJsDatabase> | null = null;

async function openWebDb(): Promise<SqlJsDatabase> {
  if (webDbPromise) return webDbPromise;
  webDbPromise = (async () => {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
    const db = new SQL.Database();
    for (const stmt of SCHEMA) {
      db.run(stmt);
    }
    webDb = db;
    return db;
  })();
  return webDbPromise;
}

function webRun(db: SqlJsDatabase, query: string, values: unknown[]): void {
  db.run(query, values as Parameters<SqlJsDatabase['run']>[1]);
}

function webQuery<T>(db: SqlJsDatabase, query: string, values: unknown[]): T[] {
  const stmt = db.prepare(query);
  stmt.bind(values as Parameters<SqlJsDatabase['run']>[1]);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

// ---------------------------------------------------------------------------
// Native path — @capacitor-community/sqlite (unchanged)
// ---------------------------------------------------------------------------

import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';

let nativeSqlite: SQLiteConnection | null = null;
let nativeDbPromise: Promise<SQLiteDBConnection> | null = null;

async function openNativeDb(): Promise<SQLiteDBConnection> {
  if (nativeDbPromise) return nativeDbPromise;
  nativeDbPromise = (async () => {
    if (!nativeSqlite) nativeSqlite = new SQLiteConnection(CapacitorSQLite);
    const isConn = (await nativeSqlite.isConnection(DB_NAME, false)).result;
    const db = isConn
      ? await nativeSqlite.retrieveConnection(DB_NAME, false)
      : await nativeSqlite.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          DB_VERSION,
          false,
        );
    await db.open();
    for (const stmt of SCHEMA) {
      await db.execute(stmt);
    }
    return db;
  })();
  return nativeDbPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sqlRun(
  query: string,
  values: unknown[] = [],
): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    const db = await openWebDb();
    webRun(db, query, values);
  } else {
    const db = await openNativeDb();
    await db.run(query, values);
  }
}

export async function sqlQuery<T = Record<string, unknown>>(
  query: string,
  values: unknown[] = [],
): Promise<T[]> {
  if (Capacitor.getPlatform() === 'web') {
    const db = await openWebDb();
    return webQuery<T>(db, query, values);
  } else {
    const db = await openNativeDb();
    const res = await db.query(query, values);
    return (res.values ?? []) as T[];
  }
}

/** Close the shared connection. Only call at app shutdown. */
export async function closeDb(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    webDb?.close();
    webDb = null;
    webDbPromise = null;
  } else {
    if (!nativeSqlite) return;
    try {
      await nativeSqlite.closeConnection(DB_NAME, false);
    } finally {
      nativeSqlite = null;
      nativeDbPromise = null;
    }
  }
}
