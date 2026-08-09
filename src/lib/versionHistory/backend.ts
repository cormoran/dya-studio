/**
 * Version history — storage backends.
 *
 * The IndexedDB backend is the real one; the in-memory backend is the fallback
 * used when IndexedDB is missing or refuses to open (private browsing, jsdom,
 * an embedded WebView). Version history is a convenience feature, so every
 * failure degrades to "no history" rather than surfacing an error into a tab.
 */
import type { NewSnapshot, StoredSnapshot, VersionStoreBackend } from "./types";

export const DB_NAME = "dya-studio-version-history";
export const DB_VERSION = 1;
export const SNAPSHOT_STORE = "snapshots";
/** Index over `[deviceKey, tabId]`, the only query the store needs. */
export const DEVICE_TAB_INDEX = "byDeviceTab";

/** Snapshots are plain JSON, so a serialization round-trip is a deep copy. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** In-memory backend: same semantics, lost on reload. */
export function createMemoryBackend(): VersionStoreBackend {
  const rows = new Map<number, StoredSnapshot>();
  let nextId = 1;

  return {
    async list(deviceKey, tabId) {
      return [...rows.values()]
        .filter((row) => row.deviceKey === deviceKey && row.tabId === tabId)
        .map(clone);
    },
    async add(snapshot: NewSnapshot) {
      const stored: StoredSnapshot = { ...clone(snapshot), id: nextId++ };
      rows.set(stored.id, stored);
      return clone(stored);
    },
    async remove(ids) {
      for (const id of ids) rows.delete(id);
    },
  };
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        const store = db.createObjectStore(SNAPSHOT_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex(DEVICE_TAB_INDEX, ["deviceKey", "tabId"], {
          unique: false,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("IndexedDB upgrade blocked by another tab"));
  });
}

/** IndexedDB-backed store, or null when IndexedDB isn't usable here. */
export function createIndexedDbBackend(): VersionStoreBackend | null {
  if (typeof indexedDB === "undefined") return null;

  // One lazily-opened connection shared by every call; a failed open is not
  // retried for the lifetime of the page (the cause is never transient).
  let dbPromise: Promise<IDBDatabase> | null = null;
  const db = () => (dbPromise ??= openDatabase());

  const tx = async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> => {
    const connection = await db();
    const transaction = connection.transaction(SNAPSHOT_STORE, mode);
    const result = await run(transaction.objectStore(SNAPSHOT_STORE));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return result;
  };

  return {
    list(deviceKey, tabId) {
      return tx("readonly", (store) =>
        promisify<StoredSnapshot[]>(
          store
            .index(DEVICE_TAB_INDEX)
            .getAll(IDBKeyRange.only([deviceKey, tabId])) as IDBRequest<
            StoredSnapshot[]
          >,
        ),
      );
    },
    add(snapshot) {
      return tx("readwrite", async (store) => {
        const key = await promisify(store.add(snapshot) as IDBRequest<number>);
        return { ...snapshot, id: key } as StoredSnapshot;
      });
    },
    remove(ids) {
      return tx("readwrite", async (store) => {
        for (const id of ids) store.delete(id);
      });
    },
  };
}

let defaultBackend: VersionStoreBackend | null = null;

/** Process-wide backend: IndexedDB when available, in-memory otherwise. */
export function getDefaultBackend(): VersionStoreBackend {
  return (defaultBackend ??= createIndexedDbBackend() ?? createMemoryBackend());
}

/** Test seam: swap the process-wide backend. */
export function setDefaultBackend(backend: VersionStoreBackend | null): void {
  defaultBackend = backend;
}
