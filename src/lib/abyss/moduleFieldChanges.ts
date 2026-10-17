export type ModuleFieldChange = { path: string; from?: unknown; to?: unknown };

/** Recursively enumerate changed leaves, retaining false, zero, null, and removals. */
export function moduleFieldChanges(
  from: unknown,
  to: unknown,
  path = "$",
): ModuleFieldChange[] {
  if (Object.is(from, to)) return [];
  const object = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  if (
    (object(from) || from === undefined) &&
    (object(to) || to === undefined)
  ) {
    const before = object(from) ? from : {};
    const after = object(to) ? to : {};
    const keys = [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].sort();
    if (!keys.length && object(from) && object(to)) return [];
    if (keys.length)
      return keys.flatMap((key) =>
        moduleFieldChanges(
          before[key],
          after[key],
          `${path}[${JSON.stringify(key)}]`,
        ),
      );
  }
  if (
    (Array.isArray(from) || from === undefined) &&
    (Array.isArray(to) || to === undefined)
  ) {
    const before = Array.isArray(from) ? from : [];
    const after = Array.isArray(to) ? to : [];
    if (
      !before.length &&
      !after.length &&
      Array.isArray(from) &&
      Array.isArray(to)
    )
      return [];
    if (before.length || after.length)
      return Array.from(
        { length: Math.max(before.length, after.length) },
        (_, index) =>
          moduleFieldChanges(before[index], after[index], `${path}[${index}]`),
      ).flat();
  }
  return [{ path, from, to }];
}
