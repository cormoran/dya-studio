// Paste/evaluate in the measured page. Does not perform application actions.
(() => {
  window.__dyaPerf?.stop();
  const supported = globalThis.PerformanceObserver?.supportedEntryTypes ?? [];
  const records = [];
  const observers = [];
  let dropped = 0;
  let label = "unlabeled";
  let windowStart = performance.now();
  function collect(entries) {
    for (const entry of entries) {
      if (records.length >= 2000) {
        dropped++;
        continue;
      }
      records.push({
        type: entry.entryType,
        name: entry.name,
        start: entry.startTime,
        duration: entry.duration,
        interactionId: entry.interactionId,
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
      });
    }
  }
  for (const type of ["event", "longtask"]) {
    if (!supported.includes(type)) continue;
    const observer = new PerformanceObserver((list) =>
      collect(list.getEntries()),
    );
    observer.observe({
      type,
      buffered: false,
      ...(type === "event" ? { durationThreshold: 16 } : {}),
    });
    observers.push(observer);
  }
  const flush = () =>
    observers.forEach((observer) => collect(observer.takeRecords()));
  window.__dyaPerf = {
    reset(nextLabel = "unlabeled") {
      flush();
      records.length = 0;
      dropped = 0;
      label = nextLabel;
      windowStart = performance.now();
      return { label, windowStart };
    },
    read() {
      flush();
      const groups = new Map();
      for (const entry of records) {
        if (entry.start < windowStart || !entry.interactionId) continue;
        const prior = groups.get(entry.interactionId);
        if (!prior || entry.duration > prior.duration)
          groups.set(entry.interactionId, entry);
      }
      return {
        url: location.href,
        timeOrigin: performance.timeOrigin,
        label,
        windowStart,
        interactions: [...groups.values()],
        now: performance.now(),
        visibility: document.visibilityState,
        viewport: [innerWidth, innerHeight],
        userAgent: navigator.userAgent,
        supported,
        dropped,
        records: [...records],
        domNodes: document.querySelectorAll("*").length,
      };
    },
    stop() {
      flush();
      observers.forEach((observer) => observer.disconnect());
    },
  };
  return window.__dyaPerf.read();
})();
