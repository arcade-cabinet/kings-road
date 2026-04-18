/**
 * Capacitor SQLite adapter for save data.
 *
 * Single shared connection, lazy-initialized. Web uses the jeep-sqlite
 * web component bundled via @capacitor-community/sqlite; native uses the
 * platform SQLite store (UserDefaults-backed on iOS, file-backed on
 * Android). One row per slot: slotId (INTEGER PRIMARY KEY) + payload
 * (TEXT JSON).
 *
 * Why SQLite over IndexedDB for saves:
 *   - Parity across web + native (same API, same schema, same file).
 *   - Makes future Drizzle-based cross-referencing with content tables
 *     straightforward (a single SQLite file holds both read-only content
 *     and mutable save rows if we ever want that unification).
 *   - Capacitor SQLite is the plugin Kings Road's CLAUDE.md already
 *     references for persistence.
 */

import { Capacitor } from '@capacitor/core';
import {
  type SQLiteConnection as _SQLiteConnection,
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'kings-road-saves';
const DB_VERSION = 1;

// A single, shared connection wrapper. CapacitorSQLite enforces one
// connection per DB name per process — opening twice throws.
let sqlite: SQLiteConnection | null = null;
let dbPromise: Promise<SQLiteDBConnection> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS save_slots (
     slotId INTEGER PRIMARY KEY,
     payload TEXT NOT NULL
   );`,
];

/** Initialize the jeep-sqlite web component on web platforms. */
async function ensureWebStore(): Promise<void> {
  if (Capacitor.getPlatform() !== 'web') return;
  // jeep-sqlite needs a <jeep-sqlite> DOM node registered before opening
  // the DB. Done once per document.
  if (typeof document === 'undefined') return;
  if (document.querySelector('jeep-sqlite')) return;
  // Lazy-load the web component bundle — it registers the custom element.
  await import('jeep-sqlite/loader').then((m) =>
    m.defineCustomElements(window),
  );
  const el = document.createElement('jeep-sqlite');
  document.body.appendChild(el);
  // Initialize the web store (must be called after element mount).
  await customElements.whenDefined('jeep-sqlite');
  await CapacitorSQLite.initWebStore();
}

async function openDb(): Promise<SQLiteDBConnection> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    await ensureWebStore();
    if (!sqlite) sqlite = new SQLiteConnection(CapacitorSQLite);

    // Check for an existing connection (hot-reload / re-init safety).
    const isConn = (await sqlite.isConnection(DB_NAME, /* readonly */ false))
      .result;
    const db = isConn
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(
          DB_NAME,
          /* encrypted */ false,
          'no-encryption',
          DB_VERSION,
          /* readonly */ false,
        );
    await db.open();
    for (const stmt of SCHEMA) {
      await db.execute(stmt);
    }
    return db;
  })();
  return dbPromise;
}

export async function sqlRun(
  query: string,
  values: unknown[] = [],
): Promise<void> {
  const db = await openDb();
  await db.run(query, values);
}

export async function sqlQuery<T = Record<string, unknown>>(
  query: string,
  values: unknown[] = [],
): Promise<T[]> {
  const db = await openDb();
  const res = await db.query(query, values);
  return (res.values ?? []) as T[];
}

/** Close the shared connection. Only call at app shutdown. */
export async function closeDb(): Promise<void> {
  if (!sqlite) return;
  try {
    await sqlite.closeConnection(DB_NAME, false);
  } finally {
    sqlite = null;
    dbPromise = null;
  }
}
