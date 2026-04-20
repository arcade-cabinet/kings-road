/**
 * SQLite adapter for save data.
 *
 * Web: sql.js with IndexedDB persistence. On open, restores a previously
 * exported Uint8Array from IndexedDB (key: IDB_KEY). After each write,
 * debounces a flush of db.export() back to IndexedDB (FLUSH_DEBOUNCE_MS).
 * No DOM component required; eliminates the jeep-sqlite wasm ABI mismatch.
 *
 * Native: @capacitor-community/sqlite — dynamically imported only on native
 * so the web bundle never pulls in its transitive wasm deps.
 *
 * Public API: sqlRun / sqlQuery / closeDb — same contract as before.
 */

import { Capacitor } from '@capacitor/core';
import { assetUrl } from '@/lib/assets';

const IS_WEB = Capacitor.getPlatform() === 'web';
const DB_NAME = 'kings-road-saves';
const DB_VERSION = 1;
const IDB_KEY = 'kings-road-saves-v1';
const FLUSH_DEBOUNCE_MS = 200;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS save_slots (
     slotId INTEGER PRIMARY KEY,
     payload TEXT NOT NULL
   );`,
];

// ---------------------------------------------------------------------------
// Web path — sql.js + IndexedDB persistence
// ---------------------------------------------------------------------------

type SqlJsDatabase = import('sql.js').Database;

let webDb: SqlJsDatabase | null = null;
let webDbPromise: Promise<SqlJsDatabase> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function idbGet(key: string): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('kings-road-db', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', 'readonly');
      const get = tx.objectStore('kv').get(key);
      get.onsuccess = () =>
        resolve((get.result as Uint8Array | undefined) ?? null);
      get.onerror = () => reject(get.error);
    };
    req.onerror = () => reject(req.error);
  });
}

function idbSet(key: string, value: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('kings-road-db', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const tx = req.result.transaction('kv', 'readwrite');
      const put = tx.objectStore('kv').put(value, key);
      put.onsuccess = () => resolve();
      put.onerror = () => reject(put.error);
    };
    req.onerror = () => reject(req.error);
  });
}

function scheduleFlush(db: SqlJsDatabase): void {
  if (flushTimer !== null) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    idbSet(IDB_KEY, db.export()).catch((err) =>
      console.warn('[save-db] IndexedDB flush failed:', err),
    );
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Flush any pending debounced write immediately. Called when the tab is
 * about to become hidden/unloaded — without this, closing the tab within
 * FLUSH_DEBOUNCE_MS of a save loses the write. Browsers guarantee that
 * IndexedDB transactions opened from `visibilitychange` or `pagehide` run
 * to completion even after the tab is gone.
 */
function flushNow(): void {
  if (flushTimer === null || !webDb) return;
  clearTimeout(flushTimer);
  flushTimer = null;
  idbSet(IDB_KEY, webDb.export()).catch((err) =>
    console.warn('[save-db] Immediate flush failed:', err),
  );
}

// Wire the flush to tab-lifecycle signals. `visibilitychange→hidden` is the
// reliable signal across desktop + mobile; `pagehide` catches older Safari.
// One-time install at module load so every save-db caller benefits without
// having to register their own listener.
if (IS_WEB && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
  window.addEventListener('pagehide', flushNow);
}

async function openWebDb(): Promise<SqlJsDatabase> {
  if (webDbPromise) return webDbPromise;
  webDbPromise = (async () => {
    let initSqlJs: typeof import('sql.js')['default'];
    try {
      initSqlJs = (await import('sql.js')).default;
    } catch (err) {
      throw new Error(`[save-db] Failed to load sql.js: ${err}`);
    }
    const SQL = await initSqlJs({
      locateFile: () => assetUrl('/sql-wasm.wasm'),
    });
    const stored = await idbGet(IDB_KEY);
    const db = stored ? new SQL.Database(stored) : new SQL.Database();
    for (const stmt of SCHEMA) {
      db.run(stmt);
    }
    webDb = db;
    return db;
  })().catch((err) => {
    // Evict so the next call retries rather than returning a rejected promise.
    webDbPromise = null;
    throw err;
  });
  return webDbPromise;
}

function webRun(db: SqlJsDatabase, query: string, values: unknown[]): void {
  db.run(query, values as Parameters<SqlJsDatabase['run']>[1]);
  scheduleFlush(db);
}

function webQuery<T>(db: SqlJsDatabase, query: string, values: unknown[]): T[] {
  const stmt = db.prepare(query);
  try {
    stmt.bind(values as Parameters<SqlJsDatabase['run']>[1]);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

// ---------------------------------------------------------------------------
// Native path — @capacitor-community/sqlite (dynamic import, web-safe)
// ---------------------------------------------------------------------------

type SQLiteDBConnection =
  import('@capacitor-community/sqlite').SQLiteDBConnection;
type SQLiteConnection = import('@capacitor-community/sqlite').SQLiteConnection;

let nativeSqlite: SQLiteConnection | null = null;
let nativeDbPromise: Promise<SQLiteDBConnection> | null = null;

async function openNativeDb(): Promise<SQLiteDBConnection> {
  if (nativeDbPromise) return nativeDbPromise;
  nativeDbPromise = (async () => {
    const { CapacitorSQLite, SQLiteConnection } = await import(
      '@capacitor-community/sqlite'
    );
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
  if (IS_WEB) {
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
  if (IS_WEB) {
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
  if (IS_WEB) {
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
      if (webDb) {
        await idbSet(IDB_KEY, webDb.export()).catch((err) =>
          console.warn('[save-db] Final flush failed:', err),
        );
      }
    }
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
