import { createMemoryBackend } from "../backend";
import { SNAPSHOT_ENVELOPE_VERSION } from "../types";
import type { VersionStoreBackend } from "../types";
import {
  MAX_VERSIONS_PER_TAB,
  deleteVersion,
  loadVersions,
  recordVersion,
} from "../versionStore";

const scope = { deviceKey: "dya-dash", tabId: "keymap", schemaVersion: 1 };

describe("recordVersion", () => {
  let backend: VersionStoreBackend;
  beforeEach(() => {
    backend = createMemoryBackend();
  });

  test("records the first snapshot", async () => {
    const result = await recordVersion(scope, { a: 1 }, 1000, backend);
    expect(result.recorded).not.toBeNull();
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0]).toMatchObject({
      timestamp: 1000,
      schemaVersion: 1,
      envelopeVersion: SNAPSHOT_ENVELOPE_VERSION,
      data: { a: 1 },
    });
  });

  test("skips a snapshot identical to the newest stored one", async () => {
    await recordVersion(scope, { a: 1, b: 2 }, 1000, backend);
    const result = await recordVersion(scope, { b: 2, a: 1 }, 2000, backend);

    expect(result.recorded).toBeNull();
    expect(result.versions).toHaveLength(1);
  });

  test("records a snapshot that differs and keeps newest first", async () => {
    await recordVersion(scope, { a: 1 }, 1000, backend);
    const result = await recordVersion(scope, { a: 2 }, 2000, backend);

    expect(result.recorded?.data).toEqual({ a: 2 });
    expect(result.versions.map((row) => row.timestamp)).toEqual([2000, 1000]);
  });

  test("re-records a snapshot equal to an older, non-newest version", async () => {
    await recordVersion(scope, { a: 1 }, 1000, backend);
    await recordVersion(scope, { a: 2 }, 2000, backend);
    const result = await recordVersion(scope, { a: 1 }, 3000, backend);

    expect(result.recorded).not.toBeNull();
    expect(result.versions).toHaveLength(3);
  });

  test("prunes beyond the retention limit, dropping the oldest", async () => {
    for (let i = 0; i <= MAX_VERSIONS_PER_TAB; i++) {
      await recordVersion(scope, { a: i }, 1000 + i, backend);
    }
    const versions = await loadVersions(scope, backend);

    expect(versions).toHaveLength(MAX_VERSIONS_PER_TAB);
    expect(versions[versions.length - 1].data).toEqual({ a: 1 });
  });

  test("keeps histories of different tabs and devices apart", async () => {
    await recordVersion(scope, { a: 1 }, 1000, backend);
    await recordVersion(
      { ...scope, tabId: "macro-combo" },
      { a: 1 },
      1000,
      backend,
    );
    await recordVersion(
      { ...scope, deviceKey: "dya2" },
      { a: 1 },
      1000,
      backend,
    );

    expect(await loadVersions(scope, backend)).toHaveLength(1);
  });
});

describe("loadVersions", () => {
  test("hides snapshots written by another payload schema", async () => {
    const backend = createMemoryBackend();
    await recordVersion(scope, { a: 1 }, 1000, backend);
    await recordVersion(
      { ...scope, schemaVersion: 2 },
      { a: 1 },
      2000,
      backend,
    );

    const versions = await loadVersions(scope, backend);
    expect(versions).toHaveLength(1);
    expect(versions[0].schemaVersion).toBe(1);
  });
});

describe("deleteVersion", () => {
  test("removes one version", async () => {
    const backend = createMemoryBackend();
    const { recorded } = await recordVersion(scope, { a: 1 }, 1000, backend);
    await deleteVersion(recorded!.id, backend);

    expect(await loadVersions(scope, backend)).toHaveLength(0);
  });
});
