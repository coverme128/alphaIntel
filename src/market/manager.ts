import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { PublicAdapter, valuationReferences } from "./adapters";
import { PublicTransport, type JsonTransport } from "./transport";
import { MarketStreams } from "./streams";
import { calculatePublicMarket, digest } from "./engine";
import {
  VENUES,
  type MarketPolicy,
  type PublicMarketState,
  type Venue,
} from "./types";
export const PUBLIC_POLICY: MarketPolicy = JSON.parse(
  readFileSync(path.resolve("config/public-market.json"), "utf8"),
);
export class PublicMarketManager {
  private state: PublicMarketState;
  private adapters: PublicAdapter[];
  private http: JsonTransport;
  private activeScan: Promise<PublicMarketState> | null = null;
  private streams: MarketStreams | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private recalc: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  constructor(
    private file: string | null,
    public policy = PUBLIC_POLICY,
    assets = ["BTC", "ETH"],
    http?: JsonTransport,
    private streaming = true,
  ) {
    if (
      !assets.length ||
      assets.length > 10 ||
      assets.some((a) => !/^([A-Z0-9]){2,12}$/.test(a))
    )
      throw new Error("INVALID_MARKET_ASSETS");
    this.http = http ?? new PublicTransport(policy.timeoutMs);
    this.adapters = VENUES.map((v) => new PublicAdapter(v, this.http));
    this.state = {
      version: 1,
      calculationInputs: { snapshots: [], valuations: [], evaluationAt: null },
      enabled: false,
      scanning: false,
      lastScanAt: null,
      computedAt: null,
      assets,
      snapshots: [],
      valuations: [],
      candidates: [],
      facts: [],
      traces: [],
      connections: VENUES.map((venue) => ({
        venue,
        state: "IDLE",
        instrumentCount: 0,
        lastSuccessAt: null,
        error: null,
        streamState: "STOPPED",
        lastMessageAt: null,
      })),
      errors: [],
      yieldStatus: "PRIVATE_PRODUCT_TERMS_REQUIRED",
      liveExecutionEnabled: false,
    };
    if (file && existsSync(file)) {
      const saved = JSON.parse(readFileSync(file, "utf8"));
      if (
        saved.version === 1 &&
        JSON.stringify(saved.assets) === JSON.stringify(assets)
      ) {
        this.state = {
          ...saved,
          enabled: false,
          scanning: false,
          connections: this.state.connections,
        };
        this.recompute();
      }
    }
  }
  private persist() {
    if (!this.file) return;
    mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    writeFileSync(this.file + ".tmp", JSON.stringify(this.state), {
      mode: 0o600,
    });
    renameSync(this.file + ".tmp", this.file);
  }
  private recompute() {
    const inputs = structuredClone({
      snapshots: this.state.snapshots,
      valuations: this.state.valuations,
      evaluationAt: Date.now(),
    });
    const calculation = calculatePublicMarket(
      inputs.snapshots,
      inputs.valuations,
      this.policy,
      inputs.evaluationAt,
    );
    Object.assign(this.state, calculation, {
      calculationInputs: inputs,
      computedAt: inputs.evaluationAt,
    });
  }
  private schedule() {
    if (this.recalc) return;
    this.recalc = setTimeout(() => {
      this.recalc = null;
      this.recompute();
    }, 750);
    this.recalc.unref();
  }
  observation() {
    return structuredClone({
      snapshots: this.state.snapshots,
      valuations: this.state.valuations,
    });
  }
  summary() {
    const now = Date.now();
    return structuredClone({
      ...this.state,
      calculationInputs: {
        snapshots: [],
        valuations: [],
        evaluationAt: this.state.computedAt,
      },
      facts: [],
      traces: [],
      candidates: this.state.candidates.map((c) => ({
        ...c,
        status:
          now > c.freshUntil && c.status !== "INCOMPLETE" ? "STALE" : c.status,
      })),
      connections: this.state.connections.map((c) => ({
        ...c,
        streamState:
          c.streamState === "LIVE" && now - (c.lastMessageAt ?? 0) > 30000
            ? "RECOVERING"
            : c.streamState,
      })),
    });
  }
  candidate(id: string) {
    const c = this.summary().candidates.find((c) => c.id === id);
    if (!c) return null;
    return {
      candidate: c,
      snapshots: this.state.calculationInputs.snapshots.filter((s) =>
        c.instrumentIds.includes(s.instrument.id),
      ),
      valuations: this.state.calculationInputs.valuations,
      facts: this.state.facts.filter((f) => c.factIds.includes(f.factId)),
      traces: this.state.traces.filter((t) => t.subjectId === id),
    };
  }
  exportSnapshot() {
    this.persist();
    return structuredClone(this.state);
  }
  async refresh(force = false) {
    if (this.activeScan) return this.activeScan;
    if (
      !force &&
      this.state.lastScanAt &&
      Date.now() - this.state.lastScanAt < 10000
    )
      return this.summary();
    const generation = this.generation;
    this.state.scanning = true;
    this.activeScan = this.scan(generation).finally(() => {
      this.state.scanning = false;
      this.activeScan = null;
    });
    return this.activeScan;
  }
  private async scan(generation: number) {
    const errors: string[] = [];
    const values = valuationReferences(this.http);
    const results = await Promise.all(
      this.adapters.map(async (adapter) => {
        const c = this.state.connections.find(
          (c) => c.venue === adapter.venue,
        )!;
        c.state = "CONNECTING";
        try {
          const instruments = await adapter.instruments(this.state.assets);
          const snapshots = await Promise.all(
            instruments.map((i) => adapter.snapshot(i)),
          );
          if (generation !== this.generation) return [];
          c.instrumentCount = instruments.length;
          c.lastSuccessAt = Date.now();
          c.error = snapshots.some((s) => s.errors.length)
            ? "PARTIAL_MARKET_DATA"
            : null;
          c.state = c.error ? "DEGRADED" : "LIVE";
          return snapshots;
        } catch (e) {
          if (generation === this.generation) {
            c.state = "DEGRADED";
            c.error = (e as Error).message;
            errors.push(`${adapter.venue}:${c.error}`);
          }
          return [];
        }
      }),
    );
    const refs = await values;
    if (generation !== this.generation) return this.summary();
    const old = this.state.snapshots;
    this.state.snapshots = results.flat().map((s) => {
      const previous = old.find((p) => p.instrument.id === s.instrument.id);
      return previous?.book?.source === "WEBSOCKET" &&
        previous.book.receivedAt > (s.book?.receivedAt ?? 0)
        ? { ...s, book: previous.book }
        : s;
    });
    this.state.valuations = refs;
    this.state.errors = [
      ...errors,
      ...(refs.length < 2 ? ["USD_REFERENCE_PARTIAL_OR_UNAVAILABLE"] : []),
    ];
    this.state.lastScanAt = Date.now();
    this.recompute();
    if (this.state.enabled && this.streaming) {
      const before = old
          .map((s) => s.instrument.id)
          .sort()
          .join("|"),
        after = this.state.snapshots
          .map((s) => s.instrument.id)
          .sort()
          .join("|");
      if (!this.streams || before !== after) this.startStreams();
    }
    this.persist();
    return this.summary();
  }
  private startStreams() {
    this.streams?.stop();
    this.streams = new MarketStreams(
      (book) => {
        const s = this.state.snapshots.find(
          (s) => s.instrument.id === book.instrumentId,
        );
        if (s) {
          if (
            s.book?.source === "WEBSOCKET" &&
            s.book.observedAt > book.observedAt
          )
            return;
          s.book = book;
          s.errors = s.errors.filter((e) => !e.startsWith("BOOK:"));
          this.schedule();
        }
      },
      (venue, status) => {
        const c = this.state.connections.find((c) => c.venue === venue)!;
        c.streamState = status.state;
        c.lastMessageAt = status.lastMessageAt;
      },
      (ids) => {
        this.state.snapshots
          .filter((s) => ids.includes(s.instrument.id))
          .forEach((s) => {
            s.book = null;
            s.errors.push("BOOK:STREAM_DISCONNECTED");
          });
        this.schedule();
      },
    );
    this.streams.start(this.state.snapshots.map((s) => s.instrument));
  }
  async start() {
    if (this.state.enabled) return this.summary();
    this.state.enabled = true;
    await this.refresh(true);
    if (!this.state.enabled) return this.summary();
    this.interval = setInterval(() => {
      void this.refresh(true).catch((e) =>
        this.state.errors.push((e as Error).message),
      );
    }, this.policy.pollIntervalMs);
    this.interval.unref();
    return this.summary();
  }
  stop() {
    this.state.enabled = false;
    this.generation++;
    this.streams?.stop();
    this.streams = null;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (this.recalc) clearTimeout(this.recalc);
    this.recalc = null;
    this.state.connections.forEach((c) => (c.streamState = "STOPPED"));
    this.persist();
    return this.summary();
  }
  async history(
    venue: Venue,
    instrumentId: string,
    start: number,
    end: number,
  ) {
    const i = this.state.snapshots.find(
      (s) => s.instrument.id === instrumentId && s.instrument.venue === venue,
    )?.instrument;
    if (!i) throw new Error("INSTRUMENT_NOT_FOUND_REFRESH_FIRST");
    if (end - start > this.policy.maxHistoryDays * 86400000)
      throw new Error("HISTORY_WINDOW_TOO_LARGE");
    const rows = await this.adapters
      .find((a) => a.venue === venue)!
      .history(i, start, end);
    const gaps = rows.slice(1).map((r, n) => r.at - rows[n].at);
    return {
      instrumentId,
      source: "PUBLIC_VENUE_SETTLEMENTS",
      requestedStart: start,
      requestedEnd: end,
      firstAt: rows[0]?.at ?? null,
      lastAt: rows.at(-1)?.at ?? null,
      observations: rows,
      intervalChangesOrGaps: [...new Set(gaps)],
      coverage: "OBSERVED_RECORDS_ONLY",
      historicalAcceptance: "NOT_EVALUATED",
      snapshotHash: digest(rows),
    };
  }
}
