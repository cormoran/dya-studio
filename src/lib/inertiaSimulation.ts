import type { InertiaSettings } from "./inputInertia";

// Port of PR #28, 7fa97aca: inertia_add_report/window_total_q16,
// inertia_handle_physical_event and inertia_finish_interval. One positive axis,
// default Kconfig (64 slices / 66 buckets), active layer, deterministic timing.
const Q16 = 65536n;
const MAX_OUTPUT = 32767n;
export const EXAMPLE_REPORT_MS = 20;
export const EXAMPLE_INPUT_MS = 5000;
export const EXAMPLE_DURATION_MS = 15000;
export interface SimulationReport {
  time: number;
  raw: number;
  scaled: number;
}
export interface SimulationOutput {
  time: number;
  value: number;
  fast: boolean;
}
interface WindowTrack {
  buckets: { number: number; value: bigint }[];
  last: number | null;
}
function track(): WindowTrack {
  return {
    buckets: Array.from({ length: 66 }, () => ({ number: 0, value: 0n })),
    last: null,
  };
}
function add(track: WindowTrack, amount: number, now: number, window: number) {
  const bucketMs = Math.ceil(window / 64);
  const start = track.last ?? now;
  const duration = Math.max(now - start, 1);
  const store = (number: number, value: bigint) => {
    const bucket = track.buckets[number % 66];
    if (bucket.number !== number) {
      bucket.number = number;
      bucket.value = 0n;
    }
    bucket.value += value;
  };
  if (start === now) store(Math.floor(now / bucketMs), BigInt(amount) * Q16);
  else {
    let cursor = Math.max(start, now - window);
    while (cursor < now) {
      const number = Math.floor(cursor / bucketMs);
      const end = Math.min(now, (number + 1) * bucketMs);
      store(
        number,
        (BigInt(amount) * Q16 * BigInt(end - cursor)) / BigInt(duration),
      );
      cursor = end;
    }
  }
  track.last = now;
}
function total(track: WindowTrack, now: number, window: number) {
  const bucketMs = Math.ceil(window / 64);
  const start = now - window;
  return track.buckets.reduce((sum, bucket) => {
    const begin = bucket.number * bucketMs,
      end = begin + bucketMs;
    if (!bucket.value || end <= start || begin > now) return sum;
    return (
      sum +
      (begin < start
        ? (bucket.value * BigInt(end - start)) / BigInt(bucketMs)
        : bucket.value)
    );
  }, 0n);
}
export function simulateInertia(
  settings: InertiaSettings,
  reports: SimulationReport[],
  duration: number,
  multiplier = 1,
  divisor = 1,
  allowFast = true,
): SimulationOutput[] {
  const outputs: SimulationOutput[] = [];
  if (!settings.inertiaEnabled) return outputs;
  const window = settings.inertiaWindowMs,
    interval = settings.inertiaIntervalMs;
  if (window <= 0 || interval <= 0) return outputs;
  const m = BigInt(multiplier > 0 && divisor > 0 ? multiplier : 1);
  const d = BigInt(multiplier > 0 && divisor > 0 ? divisor : 1);
  const denominator = BigInt(window) * Q16;
  let rawTrack = track(),
    scaledTrack = track();
  let active = false,
    fast = false,
    received = false,
    speed = 0n;
  let outputRemainder = 0n,
    scaleRemainder = 0n,
    fastRemainder = 0n;
  let nextTick = Infinity,
    index = 0;
  const fastThreshold = allowFast ? settings.inertiaFastThreshold : 0;
  while (true) {
    const report = reports[index];
    const time = Math.min(report?.time ?? Infinity, nextTick);
    if (time > duration || !Number.isFinite(time)) break;
    // A report at the tick boundary is handled first in this fixed scenario.
    if (report && report.time <= nextTick) {
      index++;
      if (report.raw <= 0) continue;
      add(rawTrack, report.raw, time, window);
      if (report.scaled > 0) add(scaledTrack, report.scaled, time, window);
      const measured = total(rawTrack, time, window);
      const scaled = total(scaledTrack, time, window);
      if (active) {
        if (fastThreshold > 0 && scaled >= BigInt(fastThreshold) * Q16)
          fast = true;
        if (measured > speed) speed = measured;
        received = true;
      } else if (
        report.scaled > 0 &&
        scaled >= BigInt(settings.inertiaThreshold) * Q16
      ) {
        active = true;
        speed = measured;
        received = true;
        fast = fastThreshold > 0 && scaled >= BigInt(fastThreshold) * Q16;
        outputRemainder = scaleRemainder = fastRemainder = 0n;
        nextTick = time + interval;
      }
      continue;
    }
    const numerator = speed * BigInt(interval) + outputRemainder;
    const raw = numerator / denominator;
    outputRemainder = numerator % denominator;
    const scaledNumerator = raw * m + scaleRemainder;
    let value = scaledNumerator / d;
    scaleRemainder = scaledNumerator % d;
    value = value > MAX_OUTPUT ? MAX_OUTPUT : value;
    if (!fast && settings.inertiaNormalMaxOutput > 0)
      value =
        value > BigInt(settings.inertiaNormalMaxOutput)
          ? BigInt(settings.inertiaNormalMaxOutput)
          : value;
    if (fast) {
      const boosted =
        value * BigInt(settings.inertiaFastOutputPercent) + fastRemainder;
      value = boosted / 100n;
      fastRemainder = boosted % 100n;
    }
    value = value > MAX_OUTPUT ? MAX_OUTPUT : value;
    outputs.push({ time, value: Number(value), fast });
    if (!received)
      speed = (speed * BigInt(100 - settings.inertiaDecayPercent)) / 100n;
    const decay = BigInt(settings.inertiaDecayPercent);
    if (!received && decay !== 0n && speed <= 4294967295n) {
      const rawNeeded = (d - scaleRemainder + m - 1n) / m;
      const missing = rawNeeded * denominator - outputRemainder;
      const future = speed * BigInt(interval) * 100n;
      if (missing > 18446744073709551615n / decay || future < missing * decay) {
        active = false;
        fast = false;
        speed = 0n;
        rawTrack = track();
        scaledTrack = track();
        nextTick = Infinity;
      }
    }
    received = false;
    if (active) nextTick = time + interval;
  }
  return outputs;
}
export function inertiaExample(
  settings: InertiaSettings,
  multiplier: number,
  divisor: number,
) {
  const m = multiplier > 0 && divisor > 0 ? multiplier : 1;
  const d = multiplier > 0 && divisor > 0 ? divisor : 1;
  let remainder = 0;
  const reports: SimulationReport[] = [];
  for (
    let time = EXAMPLE_REPORT_MS;
    time <= EXAMPLE_INPUT_MS;
    time += EXAMPLE_REPORT_MS
  ) {
    const raw = Math.round(
      40 * (1 - Math.abs((2 * time) / EXAMPLE_INPUT_MS - 1)),
    );
    const numerator = raw * m + remainder;
    const scaled = Math.trunc(numerator / d);
    remainder = numerator - scaled * d;
    reports.push({ time, raw, scaled });
  }
  const enabled = { ...settings, inertiaEnabled: true };
  const normal = simulateInertia(
    enabled,
    reports,
    EXAMPLE_DURATION_MS,
    m,
    d,
    false,
  );
  const fast = simulateInertia(
    enabled,
    reports,
    EXAMPLE_DURATION_MS,
    m,
    d,
    true,
  );
  const points = Array.from(
    { length: EXAMPLE_DURATION_MS / EXAMPLE_REPORT_MS + 1 },
    (_, i) => ({ time: i * EXAMPLE_REPORT_MS, input: 0, normal: 0, fast: 0 }),
  );
  for (const report of reports)
    points[report.time / EXAMPLE_REPORT_MS].input += report.scaled;
  for (const [key, outputs] of [
    ["normal", normal],
    ["fast", fast],
  ] as const) {
    for (const output of outputs)
      points[Math.ceil(output.time / EXAMPLE_REPORT_MS)][key] += output.value;
  }
  for (const point of points) {
    point.normal += point.input;
    point.fast += point.input;
  }
  return points;
}
