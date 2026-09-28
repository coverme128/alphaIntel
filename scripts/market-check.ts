import { PublicMarketManager } from "../src/market/manager";
import { writeFileSync } from "node:fs";
const manager = new PublicMarketManager(null);
try {
  const start = Date.now();
  await manager.start();
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const state = manager.exportSnapshot();
  const summary = {
    elapsedMs: Date.now() - start,
    asOf: new Date().toISOString(),
    connections: state.connections,
    snapshots: state.snapshots.map((s) => ({
      id: s.instrument.id,
      bookSource: s.book?.source,
      bookAgeMs: s.book ? Date.now() - s.book.observedAt : null,
      fundingHistory: s.funding?.history.length ?? 0,
      intervalHours: s.funding ? s.funding.intervalMs / 3600000 : null,
      errors: s.errors,
    })),
    valuations: state.valuations,
    candidateCount: state.candidates.length,
    strategies: [...new Set(state.candidates.map((c) => c.strategy))],
    statusCounts: state.candidates.reduce(
      (a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }),
      {} as Record<string, number>,
    ),
    errors: state.errors,
  };
  if (process.argv[2])
    writeFileSync(process.argv[2], JSON.stringify(state, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  manager.stop();
}
