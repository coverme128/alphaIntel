import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInstrument,
  canonicalBook,
  normalizeHistory,
  observedInterval,
  PublicAdapter,
} from "../src/market/adapters";
import { PublicTransport } from "../src/market/transport";
import {
  DeltaBook,
  streamChannels,
  aggregateStreamStatus,
} from "../src/market/streams";
import { PUBLIC_POLICY, PublicMarketManager } from "../src/market/manager";
import {
  pairEconomics,
  calculatePublicMarket,
  roundedQuantity,
  conservativeSideCashflow,
  evaluateYieldTerms,
  digest,
} from "../src/market/engine";
import type {
  Instrument,
  MarketSnapshot,
  Funding,
  ValuationReference,
  Venue,
} from "../src/market/types";
import { createApp } from "../src/server/app";
import { Store } from "../src/server/store";
import { Service } from "../src/server/service";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const now = Date.now(),
  hour = 3600000;
const refs: ValuationReference[] = [
  {
    asset: "USDT",
    usdPrice: 1,
    observedAt: now,
    source: "COINBASE_PUBLIC_SPOT",
    quality: "REFERENCE_ONLY",
  },
  {
    asset: "USDC",
    usdPrice: 0.98,
    observedAt: now,
    source: "COINBASE_PUBLIC_SPOT",
    quality: "REFERENCE_ONLY",
  },
];
function market(
  venue: Venue,
  kind: Instrument["kind"] = "SPOT",
  bid = 99.99,
  ask = 100,
): MarketSnapshot {
  const i: Instrument = {
    id: `${venue}:${kind}:BTC`,
    venue,
    symbol: "BTCUSDT",
    base: "BTC",
    quote: "USDT",
    settlement: "USDT",
    kind,
    model: kind === "SPOT" ? "SPOT" : "LINEAR",
    quantityUnit: "BASE",
    basePerContract: 1,
    qtyStep: 0.001,
    minQty: 0.001,
    minNotional: 5,
    tickSize: 0.01,
    active: true,
    expiresAt: kind === "FUTURE" ? now + 90 * 86400000 : null,
    fundingIntervalMs: kind === "PERPETUAL" ? 8 * hour : null,
    metadataAt: now,
  };
  const funding: Funding = {
    rate: 0.002,
    intervalMs: 8 * hour,
    nextSettlementAt: now + 8 * hour,
    intervalSource: "VENUE",
    observedAt: now,
    history: Array.from({ length: 12 }, (_, n) => ({
      rate: 0.002,
      at: now - (11 - n) * 8 * hour,
    })),
  };
  return {
    instrument: i,
    book: canonicalBook(i, [[bid, 2000]], [[ask, 2000]], now, now),
    markPrice: kind === "SPOT" ? null : 100,
    indexPrice: kind === "SPOT" ? null : 100,
    funding: kind === "PERPETUAL" ? funding : null,
    errors: [],
    receivedAt: now,
  };
}
test("OKX contracts normalize to base exposure; no raw contract/base mixing", () => {
  const i = normalizeInstrument(
    "OKX",
    {
      instId: "BTC-USDT-SWAP",
      uly: "BTC-USDT",
      settleCcy: "USDT",
      ctType: "linear",
      ctValCcy: "BTC",
      ctVal: "0.01",
      ctMult: "1",
      lotSz: "0.01",
      minSz: "0.01",
      tickSz: "0.1",
      state: "live",
    },
    "PERPETUAL",
    now,
  );
  assert.equal(i.quantityUnit, "CONTRACTS");
  const b = canonicalBook(i, [["99", "100"]], [["100", "200"]], now, now);
  assert.equal(b.bids[0][1], 1);
  assert.equal(b.asks[0][1], 2);
  assert.throws(
    () =>
      normalizeInstrument("OKX", { ...i, ctType: "inverse" }, "PERPETUAL", now),
    /UNSUPPORTED/,
  );
});
test("Binance / Bybit / Hyperliquid instrument rules preserve venue order minimums", () => {
  const b = normalizeInstrument(
    "Binance",
    {
      symbol: "BTCUSDT",
      baseAsset: "BTC",
      quoteAsset: "USDT",
      status: "TRADING",
      filters: [
        { filterType: "LOT_SIZE", stepSize: ".00001", minQty: ".00001" },
        { filterType: "NOTIONAL", minNotional: "5" },
        { filterType: "PRICE_FILTER", tickSize: ".01" },
      ],
    },
    "SPOT",
    now,
  );
  assert.equal(b.minNotional, 5);
  const y = normalizeInstrument(
    "Bybit",
    {
      symbol: "BTCUSDT",
      baseCoin: "BTC",
      quoteCoin: "USDT",
      settleCoin: "USDT",
      status: "Trading",
      fundingInterval: 60,
      priceFilter: { tickSize: ".1" },
      lotSizeFilter: {
        qtyStep: ".001",
        minOrderQty: ".001",
        minNotionalValue: "5",
      },
    },
    "PERPETUAL",
    now,
  );
  assert.equal(y.fundingIntervalMs, hour);
  const h = normalizeInstrument(
    "Hyperliquid",
    { name: "BTC", szDecimals: 5 },
    "PERPETUAL",
    now,
  );
  assert.equal(h.qtyStep, 0.00001);
  assert.equal(h.tickSize, null);
  assert.equal(h.quote, "USDC");
});
test("rounding uses decimal steps and rounds down only", () => {
  assert.equal(roundedQuantity(0.123456, 0.01, 0.01), 12.34);
  assert.equal(roundedQuantity(0.3, 1, 0.1), 0.3);
  assert.throws(() => roundedQuantity(1, 1, 0));
});
test("funding cashflows are side-aware; paying leg chooses worse historical value", () => {
  const f = market("OKX", "PERPETUAL").funding!;
  f.rate = 0.001;
  assert.equal(conservativeSideCashflow(f, "SELL"), 0.001);
  assert.equal(conservativeSideCashflow(f, "BUY"), -0.002);
  f.history = f.history.slice(0, 7);
  assert.throws(() => conservativeSideCashflow(f, "SELL"), /INSUFFICIENT/);
});
test("observed funding schedules are inferred from actual timestamps and detect interval changes", () => {
  assert.equal(
    observedInterval([0, 1, 2, 3].map((n) => ({ at: n * hour, rate: 0.001 }))),
    hour,
  );
  assert.throws(
    () =>
      observedInterval([
        { at: 0, rate: 0 },
        { at: hour, rate: 0 },
        { at: 3 * hour, rate: 0 },
        { at: 4 * hour, rate: 0 },
      ]),
    /CHANGED/,
  );
});
test("history normalization deduplicates, sorts, uses settled OKX rates and rejects conflicts", () => {
  const raw = [
    { fundingTime: 200, realizedRate: ".002", fundingRate: ".01" },
    { fundingTime: 100, realizedRate: ".001" },
    { fundingTime: 200, realizedRate: ".002" },
  ];
  assert.deepEqual(normalizeHistory(raw, "OKX", 0, 300), [
    { at: 100, rate: 0.001 },
    { at: 200, rate: 0.002 },
  ]);
  assert.throws(
    () =>
      normalizeHistory(
        [...raw, { fundingTime: 200, realizedRate: ".003" }],
        "OKX",
        0,
        300,
      ),
    /CONFLICTING/,
  );
});
test("funding neutral uses actual hourly events and separates costs and reserves", () => {
  const a = market("OKX"),
    b = market("OKX", "PERPETUAL");
  const e = pairEconomics(
    "FUNDING_NEUTRAL",
    a,
    b,
    5000,
    refs,
    PUBLIC_POLICY,
    now,
  );
  assert.ok(e.netPct !== null);
  assert.equal(e.grossPct, 0.6);
  assert.ok(e.expectedCostPct! > 0.31);
  assert.equal(e.reservePct, 0.02);
  assert.equal(
    e.netPct,
    Number((e.grossPct! - e.expectedCostPct! - e.reservePct).toFixed(10)),
  );
  assert.equal(e.publicGatesPass, true);
  b.funding!.intervalMs = hour;
  b.funding!.nextSettlementAt = now + hour;
  b.funding!.history = b.funding!.history.map((r, n) => ({
    ...r,
    at: now - (11 - n) * hour,
  }));
  const hourly = pairEconomics(
    "FUNDING_NEUTRAL",
    a,
    b,
    5000,
    refs,
    PUBLIC_POLICY,
    now,
  );
  assert.equal(hourly.grossPct, 1.6); // 8-hour minimum hold, not a hard-coded 8-hour settlement
});
test("spot spreads use exact top-to-VWAP difference exactly once", () => {
  const a = market("OKX"),
    b = market("Bybit", "SPOT", 101, 101.01);
  a.book!.asks = [
    [100, 10],
    [100.02, 1000],
  ];
  b.book!.bids = [
    [101, 10],
    [100.98, 1000],
  ];
  const e = pairEconomics(
    "CROSS_EXCHANGE_SPREAD",
    a,
    b,
    5000,
    refs,
    PUBLIC_POLICY,
    now,
  );
  const [buy, sell] = e.legs;
  const gross = (101 / 100 - 1) * 100,
    executable = (sell.vwap / buy.vwap - 1) * 100;
  assert.ok(Math.abs(e.entrySlippagePct! - (gross - executable)) < 1e-10);
  const fees =
    (buy.notionalUsd * buy.feeBps + sell.notionalUsd * sell.feeBps) / 10000;
  assert.ok(
    Math.abs(e.netPct! - (executable - (fees / buy.notionalUsd) * 100 - 0.02)) <
      1e-8,
  );
  const cashPnl =
    sell.notionalUsd - buy.notionalUsd - fees - buy.notionalUsd * 0.0002;
  assert.ok(Math.abs(e.expectedPnlUsd! - cashPnl) < 0.000001);
  assert.equal(e.reservePct, 0);
});
test("basis uses dated expiry and applies annualized comparison gate", () => {
  const a = market("Bybit"),
    b = market("Bybit", "FUTURE", 103, 103.01);
  const e = pairEconomics(
    "BASIS_CASH_CARRY",
    a,
    b,
    5000,
    refs,
    PUBLIC_POLICY,
    now,
  );
  assert.ok(Math.abs(e.grossPct! - 3) < 1e-8);
  assert.ok(
    Math.abs(e.annualizedComparisonPct! - (e.netPct! * 365) / 90) < 1e-8,
  );
  b.instrument.expiresAt = now + 3 * 86400000;
  assert.ok(
    pairEconomics(
      "BASIS_CASH_CARRY",
      a,
      b,
      5000,
      refs,
      PUBLIC_POLICY,
      now,
    ).reasonCodes.includes("EXPIRY_OUT_OF_RANGE"),
  );
});
test("cross venue funding calculates both directions and never treats funding as always received", () => {
  const a = market("OKX", "PERPETUAL"),
    b = market("Bybit", "PERPETUAL");
  a.funding!.rate = 0.001;
  a.funding!.history = a.funding!.history.map((r) => ({ ...r, rate: 0.001 }));
  const forward = pairEconomics(
      "CROSS_EXCHANGE_FUNDING",
      a,
      b,
      5000,
      refs,
      PUBLIC_POLICY,
      now,
    ),
    reverse = pairEconomics(
      "CROSS_EXCHANGE_FUNDING",
      b,
      a,
      5000,
      refs,
      PUBLIC_POLICY,
      now,
    );
  assert.equal(forward.grossPct, 0.3);
  assert.equal(reverse.grossPct, -0.3);
});
test("stale data, missing valuation and thin depth fail closed", () => {
  const a = market("OKX"),
    b = market("Bybit", "SPOT", 101, 101.01);
  assert.ok(
    pairEconomics(
      "CROSS_EXCHANGE_SPREAD",
      a,
      b,
      5000,
      refs,
      PUBLIC_POLICY,
      now + 751,
    ).reasonCodes.includes("ORDER_BOOK_STALE"),
  );
  assert.equal(
    pairEconomics("CROSS_EXCHANGE_SPREAD", a, b, 5000, [], PUBLIC_POLICY, now)
      .netPct,
    null,
  );
  a.book!.asks = [[100, 1]];
  assert.ok(
    pairEconomics(
      "CROSS_EXCHANGE_SPREAD",
      a,
      b,
      5000,
      refs,
      PUBLIC_POLICY,
      now,
    ).reasonCodes.includes("DEPTH_OR_MIN_ORDER_FAILED"),
  );
});
test("stablecoin USD conversion uses observed non-peg price", () => {
  const a = market("OKX"),
    b = market("Bybit", "SPOT", 101, 101.01);
  b.instrument.quote = "USDC";
  const e = pairEconomics(
    "CROSS_EXCHANGE_SPREAD",
    a,
    b,
    5000,
    refs,
    PUBLIC_POLICY,
    now,
  );
  assert.ok(Math.abs(e.grossPct! - ((101 * 0.98) / 100 - 1) * 100) < 1e-8);
  assert.ok(e.netPct! < 0);
});
test("multi-leg sizes are matched before rounding", () => {
  const a = market("OKX"),
    b = market("Bybit", "SPOT", 101, 101.01);
  b.instrument.qtyStep = 30;
  const e = pairEconomics(
    "CROSS_EXCHANGE_SPREAD",
    a,
    b,
    5000,
    refs,
    PUBLIC_POLICY,
    now,
  );
  assert.equal(e.deltaMismatchPct, 0);
  assert.equal(e.legs[0].baseQuantity, 30);
  assert.equal(e.legs[1].baseQuantity, 30);
  assert.equal(e.roundedNotionalUsd, 3000);
  assert.ok(Math.abs(e.expectedPnlUsd! - (3000 * e.netPct!) / 100) < 0.000001);
});
test("public candidate is never executable, has capacity haircut and reproducible linked facts", () => {
  const snapshots = [market("OKX"), market("OKX", "PERPETUAL")];
  const r = calculatePublicMarket(snapshots, refs, PUBLIC_POLICY, now),
    c = r.candidates[0];
  assert.equal(c.executable, false);
  assert.equal(c.executableCapacityUsd, null);
  assert.ok(c.marketCapacityUsd! < 200000);
  assert.ok(c.executionBlockers.includes("MARGIN_AND_LIQUIDATION_UNKNOWN"));
  assert.equal(
    c.inputHash,
    digest({ a: snapshots[0], b: snapshots[1], refs, evaluationAt: now }),
  );
  const ids = new Set(r.facts.map((f) => f.factId));
  assert.ok(c.factIds.every((id) => ids.has(id)));
  assert.ok(r.traces.every((t) => ids.has(t.outputFactId)));
  assert.deepEqual(
    r,
    calculatePublicMarket(snapshots, refs, PUBLIC_POLICY, now),
  );
});
test("Bybit snapshots, zero-size deletion, out-of-order updates and restart", () => {
  const b = new DeltaBook();
  assert.throws(
    () => b.update({ b: [], a: [], u: 2 }, "delta"),
    /SNAPSHOT_REQUIRED/,
  );
  b.update({ b: [["100", "2"]], a: [["101", "3"]], u: 10 }, "snapshot");
  const update = b.update(
    {
      b: [
        ["100", "0"],
        ["99", "1"],
      ],
      a: [],
      u: 11,
    },
    "delta",
  );
  assert.deepEqual(update.bids, [["99", "1"]]);
  assert.throws(
    () => b.update({ b: [], a: [], u: 10 }, "delta"),
    /OUT_OF_ORDER/,
  );
  assert.deepEqual(
    b.update({ b: [["90", "1"]], a: [["91", "1"]], u: 1 }, "snapshot").bids,
    [["90", "1"]],
  );
});
test("stream subscriptions separate same-symbol spot and perpetual markets", () => {
  const channels = streamChannels([
    market("Binance").instrument,
    market("Binance", "PERPETUAL").instrument,
    market("Bybit").instrument,
    market("Bybit", "PERPETUAL").instrument,
  ]);
  assert.equal(channels.length, 4);
  assert.equal(new Set(channels.map((c) => c.url)).size, 4);
});
test("yield terms calculate APR/APY incremental returns and remain account gated", () => {
  const t = {
    productId: "example",
    termsVersion: "test",
    allowListed: true,
    assetRiskTier: "A",
    ratePct: 8,
    quoteType: "APR" as const,
    baselineRatePct: 4,
    baselineQuoteType: "APR" as const,
    termDays: 30,
    lockDays: 0,
    redemptionHours: 2,
    expectedCostPct: 0.02,
    capacityUsd: 20000,
    observedAt: now,
    ttlMs: 60000,
    amountUsd: 5000,
  };
  const result = evaluateYieldTerms(t, now);
  assert.ok(Math.abs(result.incrementalNetPct - 0.3087671232876712) < 1e-10);
  assert.equal(result.publicGatesPass, true);
  assert.equal(result.executable, false);
  assert.equal(
    evaluateYieldTerms({ ...t, lockDays: 30 }, now).publicGatesPass,
    false,
  );
  assert.throws(() => evaluateYieldTerms({ ...t, termDays: 0 }, now));
});
test("transport coalesces identical requests; validates origin and 429 backoff", async () => {
  let calls = 0;
  const fake = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return new Response('{"ok":true}', { status: 200 });
  };
  const transport = new PublicTransport(100, fake as typeof fetch);
  const url = "https://api.bybit.com/v5/market/time";
  await Promise.all([transport.get(url), transport.get(url)]);
  assert.equal(calls, 1);
  await assert.rejects(
    () => transport.get("https://evil.example"),
    /UNAPPROVED/,
  );
  const limited = new PublicTransport(
    100,
    (async () =>
      new Response("", {
        status: 429,
        headers: { "retry-after": "60" },
      })) as typeof fetch,
  );
  await assert.rejects(() => limited.get(url), /VENUE_RATE_LIMIT/);
  await assert.rejects(() => limited.get(url), /BACKOFF/);
});
test("historical pagination moves backwards for Bybit and respects window", async () => {
  let pages = 0;
  const start = now - 500 * hour;
  const mock = {
    get: async () => {
      pages++;
      return {
        result: {
          list: Array.from({ length: pages === 1 ? 200 : 10 }, (_, n) => ({
            fundingRateTimestamp: String(now - ((pages - 1) * 200 + n) * hour),
            fundingRate: ".001",
          })),
        },
      };
    },
  };
  const adapter = new PublicAdapter("Bybit", mock);
  const rows = await adapter.history(
    market("Bybit", "PERPETUAL").instrument,
    start,
    now,
  );
  assert.equal(pages, 2);
  assert.equal(rows.length, 210);
  assert.ok(rows[0].at < rows.at(-1)!.at);
  await assert.rejects(
    () =>
      adapter.history(
        market("Bybit", "PERPETUAL").instrument,
        now - 100 * 86400000,
        now,
      ),
    /INVALID_HISTORY_WINDOW/,
  );
});
test("manager reports network errors instead of substituting synthetic markets", async () => {
  const manager = new PublicMarketManager(
    null,
    PUBLIC_POLICY,
    ["BTC"],
    {
      get: async () => {
        throw new Error("OFFLINE");
      },
    },
    false,
  );
  const s = await manager.start();
  assert.equal(s.candidates.length, 0);
  assert.equal(s.snapshots.length, 0);
  assert.ok(s.connections.every((c) => c.state === "DEGRADED"));
  manager.stop();
  assert.equal(manager.summary().enabled, false);
});
test("public API controls, private gating and invalid history requests", async () => {
  const manager = new PublicMarketManager(
    null,
    PUBLIC_POLICY,
    ["BTC"],
    {
      get: async () => {
        throw new Error("OFFLINE");
      },
    },
    false,
  );
  const server = createApp(new Service(new Store(null)), manager).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await fetch(url + "/api/public-market")).status, 200);
    assert.equal((await fetch(url + "/api/private/OKX/balances")).status, 403);
    assert.equal(
      (
        await fetch(
          url +
            "/api/public-market/history?venue=OKX&instrumentId=x&start=NaN&end=4",
        )
      ).status,
      400,
    );
    const body = await (await fetch(url + "/api/connections")).json();
    assert.ok(
      body.every(
        (c: any) => c.configured === false && c.tradeEnabled === false,
      ),
    );
    const started = await fetch(url + "/api/public-market/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Alpha-Client": "owner-ui",
      },
      body: "{}",
    });
    assert.equal(started.status, 200);
    assert.equal((await started.json()).candidates.length, 0);
  } finally {
    manager.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("single export retains exact public inputs, configuration and reproducible facts", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "alpha-public-export-"));
  const file = path.join(dir, "public.json");
  const initial = new PublicMarketManager(null).exportSnapshot();
  initial.snapshots = [market("OKX"), market("OKX", "PERPETUAL")];
  initial.valuations = refs;
  writeFileSync(file, JSON.stringify(initial));
  const manager = new PublicMarketManager(
    file,
    PUBLIC_POLICY,
    ["BTC", "ETH"],
    undefined,
    false,
  );
  const server = createApp(new Service(new Store(null)), manager).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as any).port}/api/export`,
    );
    assert.equal(response.status, 200);
    const exported = await response.json();
    const replayed = calculatePublicMarket(
      exported.metadata.publicMarketInputs,
      exported.metadata.valuationReferences,
      exported.metadata.publicMarketPolicy,
      exported.metadata.publicMarketAsOf,
    );
    const publicCandidates = exported.opportunities.filter(
      (c: any) => c.source === "PUBLIC_MARKET",
    );
    assert.deepEqual(publicCandidates, replayed.candidates);
    const ids = new Set(replayed.facts.map((f) => f.factId));
    assert.deepEqual(
      exported.calculationFacts.filter((f: any) => ids.has(f.factId)),
      replayed.facts,
    );
    assert.ok(publicCandidates.every((c: any) => !c.executable));
  } finally {
    manager.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  }
});

test("venue stream health requires every subscribed channel, not only the last active one", () => {
  const live = { state: "LIVE" as const, lastMessageAt: now, error: null };
  const failed = {
    state: "RECOVERING" as const,
    lastMessageAt: null,
    error: "UNAVAILABLE",
  };
  assert.equal(aggregateStreamStatus([live, failed]).state, "RECOVERING");
  assert.equal(aggregateStreamStatus([live, failed]).lastMessageAt, null);
  assert.equal(
    aggregateStreamStatus([live, { ...live, lastMessageAt: now - 100 }])
      .lastMessageAt,
    now - 100,
  );
});
