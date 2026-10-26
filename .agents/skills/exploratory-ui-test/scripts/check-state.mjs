import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

// Eligibility and restoration structure only. Initial readings/UI restoration
// routes must be independently reviewed before this guard authorizes an edit.
try {
  const [phase, baselinePath, observationPath] = process.argv.slice(2);
  if (
    process.argv.length !== 5 ||
    !["before-mutation", "restored"].includes(phase)
  )
    throw new Error(
      "Usage: check-state.mjs <before-mutation|restored> <baseline.json> <observation.json>",
    );
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const observation = JSON.parse(readFileSync(observationPath, "utf8"));
  const errors = [];
  const nonempty = (value) =>
    typeof value === "string" && value.trim().length > 0;
  const evidence = (item, path) => {
    if (!Array.isArray(item.evidence) || !item.evidence.length) return false;
    return item.evidence.every((name) => {
      try {
        if (!nonempty(name)) return false;
        const file = statSync(resolve(dirname(path), name));
        return file.isFile() && file.size > 0;
      } catch {
        return false;
      }
    });
  };
  const values = (item) =>
    item.values &&
    typeof item.values === "object" &&
    !Array.isArray(item.values) &&
    Object.keys(item.values).length > 0 &&
    Object.values(item.values).every(
      (value) =>
        typeof value === "boolean" ||
        (typeof value === "string" && value.trim().length > 0) ||
        (typeof value === "number" && Number.isFinite(value)),
    );
  if (
    !nonempty(baseline.pageId) ||
    !nonempty(baseline.session) ||
    !values(baseline) ||
    !evidence(baseline, baselinePath)
  )
    errors.push(
      "baseline needs original pageId/session, exact source/field values and evidence",
    );
  if (
    baseline.pageId !== observation.pageId ||
    baseline.session !== observation.session
  )
    errors.push("page/session changed; a fresh Demo is not restoration");
  if (!values(observation) || !evidence(observation, observationPath))
    errors.push("observation needs exact source/field values and evidence");
  if (!isDeepStrictEqual(baseline.values, observation.values))
    errors.push(
      "source/field values differ or are missing; retain exact residuals",
    );
  if (phase === "before-mutation") {
    // Every affected source/field needs its own demonstrated UI restoration path.
    // A global preset cannot restore unequal source values.
    for (const key of Object.keys(baseline.values ?? {})) {
      const route = observation.restoreRoutes?.[key];
      if (
        !route ||
        !nonempty(route.control) ||
        !evidence(route, observationPath)
      )
        errors.push(`${key}: no evidenced UI restoration route; do not mutate`);
    }
  } else if (observation.readback !== "application-reload") {
    errors.push(
      "final readback must follow application Reload/Refresh, not document navigation",
    );
  }
  console.log(
    JSON.stringify({ phase, allowed: errors.length === 0, errors }, null, 2),
  );
  process.exitCode = errors.length ? 1 : 0;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
