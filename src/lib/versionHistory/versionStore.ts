/**
 * Version history — store logic on top of a {@link VersionStoreBackend}.
 *
 * The rule the tabs rely on: after a tab has finished reading *everything* it
 * owns from the keyboard, it hands the resulting snapshot here. If it differs
 * from the newest snapshot already stored for that device+tab, it is appended
 * as a new version stamped with the current time; if it is identical, nothing
 * happens, so simply switching tabs back and forth doesn't spam the history.
 */
import { getDefaultBackend } from "./backend";
import { snapshotsEqual } from "./diff";
import {
  SNAPSHOT_ENVELOPE_VERSION,
  type JsonValue,
  type StoredSnapshot,
  type VersionStoreBackend,
} from "./types";

/** Versions kept per device+tab; the oldest are dropped beyond this. */
export const MAX_VERSIONS_PER_TAB = 30;

/** Device+tab coordinates of one history, plus the payload schema in use. */
export interface VersionScope {
  deviceKey: string;
  tabId: string;
  schemaVersion: number;
}

/**
 * Versions for `scope`, newest first. Snapshots written by a different payload
 * schema are skipped: their shape is not the one this build knows how to apply.
 */
export async function loadVersions<T extends JsonValue>(
  scope: VersionScope,
  backend: VersionStoreBackend = getDefaultBackend(),
): Promise<StoredSnapshot<T>[]> {
  const rows = await backend.list(scope.deviceKey, scope.tabId);
  return rows
    .filter(
      (row) =>
        row.envelopeVersion === SNAPSHOT_ENVELOPE_VERSION &&
        row.schemaVersion === scope.schemaVersion,
    )
    .sort((a, b) => b.timestamp - a.timestamp) as StoredSnapshot<T>[];
}

export interface RecordVersionResult<T extends JsonValue> {
  /** The full history after recording, newest first. */
  versions: StoredSnapshot<T>[];
  /** The snapshot that was appended, or null when nothing changed. */
  recorded: StoredSnapshot<T> | null;
}

/**
 * Record `data` as a new version when it differs from the newest stored one.
 * `now` is injected so callers (and tests) control the timestamp.
 */
export async function recordVersion<T extends JsonValue>(
  scope: VersionScope,
  data: T,
  now: number = Date.now(),
  backend: VersionStoreBackend = getDefaultBackend(),
): Promise<RecordVersionResult<T>> {
  const versions = await loadVersions<T>(scope, backend);
  const latest = versions[0];
  if (latest && snapshotsEqual(latest.data, data)) {
    return { versions, recorded: null };
  }

  const recorded = (await backend.add({
    envelopeVersion: SNAPSHOT_ENVELOPE_VERSION,
    deviceKey: scope.deviceKey,
    tabId: scope.tabId,
    schemaVersion: scope.schemaVersion,
    timestamp: now,
    data,
  })) as StoredSnapshot<T>;

  const next = [recorded, ...versions];
  const excess = next.slice(MAX_VERSIONS_PER_TAB);
  if (excess.length > 0) {
    await backend.remove(excess.map((row) => row.id));
  }
  return { versions: next.slice(0, MAX_VERSIONS_PER_TAB), recorded };
}

/** Delete a single stored version. */
export async function deleteVersion(
  id: number,
  backend: VersionStoreBackend = getDefaultBackend(),
): Promise<void> {
  await backend.remove([id]);
}
