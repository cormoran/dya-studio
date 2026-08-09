/**
 * Version history — shared record types.
 *
 * Every tab that can write to the keyboard snapshots what it just read back
 * into IndexedDB, so a user can roll the tab back to an earlier state. The
 * payload of a snapshot is plain, schema-versioned JSON: each tab owns its own
 * `schemaVersion` and bumps it whenever the shape of its payload changes.
 * Records whose `schemaVersion` no longer matches the running app are kept on
 * disk but hidden from the version list — an old payload can't be applied
 * safely, and silently mis-applying one would write garbage to the keyboard.
 */

/** JSON-compatible value. Snapshot payloads must serialize losslessly. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Version of the record envelope itself (the fields around `data`). Bumped
 * only when this wrapper changes, independently of any tab's `schemaVersion`.
 */
export const SNAPSHOT_ENVELOPE_VERSION = 1;

/** A snapshot as it is handed to the store (before an id is assigned). */
export interface NewSnapshot<T extends JsonValue = JsonValue> {
  /** Envelope format version — see {@link SNAPSHOT_ENVELOPE_VERSION}. */
  envelopeVersion: number;
  /** Identifies the keyboard the snapshot was read from. */
  deviceKey: string;
  /** Tab that owns the payload (`"keymap"`, `"macro-combo"`, ...). */
  tabId: string;
  /** Schema version of `data`, owned by the tab. */
  schemaVersion: number;
  /** When the snapshot was captured (epoch ms). */
  timestamp: number;
  /** The tab's snapshot payload — schema-versioned JSON. */
  data: T;
}

/** A snapshot read back from the store. */
export interface StoredSnapshot<
  T extends JsonValue = JsonValue,
> extends NewSnapshot<T> {
  id: number;
}

/**
 * Storage backend behind the version store. Kept behind an interface so the
 * app can fall back to an in-memory store when IndexedDB is unavailable
 * (private browsing, an old WebView, jsdom in tests) instead of breaking the
 * tabs that depend on it.
 */
export interface VersionStoreBackend {
  /** All snapshots for one device+tab, in unspecified order. */
  list(deviceKey: string, tabId: string): Promise<StoredSnapshot[]>;
  /** Append a snapshot and return it with its assigned id. */
  add(snapshot: NewSnapshot): Promise<StoredSnapshot>;
  /** Remove snapshots by id. Unknown ids are ignored. */
  remove(ids: number[]): Promise<void>;
}
