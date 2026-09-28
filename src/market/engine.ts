import { Decimal } from "decimal.js";
import { createHash } from "node:crypto";
import {
  conservativeFunding,
  fundingSchedule,
  quantile,
  walkBook,
  termReturn,
  round,
  type Strategy,
} from "../domain/calculations";
import type {
  MarketSnapshot,
  MarketPolicy,
  ValuationReference,
  SizeEconomics,
  MarketLeg,
  PublicCandidate,
  PublicFact,
  PublicTrace,
  Funding,
} from "./types";
export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const unique = (a: string[]) => [...new Set(a)];
export function roundedQuantity(
  baseQuantity: number,
  basePerContract: number,
  step: number,
) {
  if (
    ![baseQuantity, basePerContract, step].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  )
    throw new Error("INVALID_QUANTITY");
  return new Decimal(baseQuantity)
    .div(basePerContract)
    .div(step)
    .floor()
    .mul(step)
    .toNumber();
}
export function matchedBaseQuantity(
  a: MarketSnapshot,
  b: MarketSnapshot,
  requestedBase: number,
) {
  const x = new Decimal(a.instrument.qtyStep).mul(a.instrument.basePerContract);
  const y = new Decimal(b.instrument.qtyStep).mul(b.instrument.basePerContract);
  const scale = new Decimal(10).pow(
    Math.max(x.decimalPlaces(), y.decimalPlaces()),
  );
  const xi = BigInt(x.mul(scale).toFixed(0)),
    yi = BigInt(y.mul(scale).toFixed(0));
  const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
  const common = new Decimal(((xi / gcd(xi, yi)) * yi).toString()).div(scale);
  return new Decimal(requestedBase).div(common).floor().mul(common).toNumber();
}
export function conservativeSideCashflow(f: Funding, side: "BUY" | "SELL") {
  const history = f.history.slice(-12);
  if (history.length < 8) throw new Error("INSUFFICIENT_FUNDING_HISTORY");
  if (history.some((r, index) => index > 0 && r.at <= history[index - 1].at))
    throw new Error("INVALID_FUNDING_HISTORY_ORDER");
  if (f.observedAt - history.at(-1)!.at > f.intervalMs * 1.5)
    throw new Error("FUNDING_HISTORY_GAP");
  const sign = side === "SELL" ? 1 : -1,
    current = sign * f.rate,
    values = history.map((h) => sign * h.rate);
  return current > 0
    ? Math.min(
        current,
        quantile(
          values.map((v) => Math.max(0, v)),
          0.25,
        ),
      )
    : Math.min(current, quantile(values, 0.25));
}
export function fundingOverHorizon(
  f: Funding,
  side: "BUY" | "SELL",
  now: number,
  end: number,
) {
  const rate = conservativeSideCashflow(f, side),
    events = fundingSchedule(f.nextSettlementAt, f.intervalMs, now, end);
  return { pct: events.length * rate * 100, eventCount: events.length, rate };
}
function valuation(
  s: MarketSnapshot,
  refs: ValuationReference[],
  now: number,
  policy: MarketPolicy,
) {
  const v = refs.find((v) => v.asset === s.instrument.quote);
  return v &&
    now - v.observedAt <= policy.valuationTtlMs &&
    v.observedAt <= now + 5000
    ? v.usdPrice
    : null;
}
function freshness(strategy: Strategy, a: MarketSnapshot, b: MarketSnapshot) {
  return strategy === "CROSS_EXCHANGE_SPREAD"
    ? a.instrument.venue === "Hyperliquid" ||
      b.instrument.venue === "Hyperliquid"
      ? 1500
      : 750
    : strategy === "FUNDING_NEUTRAL"
      ? 1500
      : 2000;
}
function exactLeg(
  s: MarketSnapshot,
  side: "BUY" | "SELL",
  baseTarget: number,
  usdPrice: number,
  policy: MarketPolicy,
): MarketLeg | null {
  if (!s.book) return null;
  const i = s.instrument,
    venueQuantity = roundedQuantity(baseTarget, i.basePerContract, i.qtyStep),
    baseQuantity = new Decimal(venueQuantity).mul(i.basePerContract).toNumber();
  if (venueQuantity < i.minQty || baseQuantity <= 0) return null;
  const walked = walkBook(
    side === "BUY" ? s.book.asks : s.book.bids,
    baseQuantity,
  );
  if (!walked.complete || walked.vwap === null) return null;
  if (walked.vwap * baseQuantity < i.minNotional) return null;
  const top = side === "BUY" ? s.book.asks[0][0] : s.book.bids[0][0];
  return {
    instrumentId: i.id,
    venue: i.venue,
    symbol: i.symbol,
    side,
    baseQuantity,
    venueQuantity,
    vwap: walked.vwap,
    notionalUsd: walked.vwap * baseQuantity * usdPrice,
    slippageBps:
      Math.max(
        0,
        side === "BUY" ? walked.vwap / top - 1 : 1 - walked.vwap / top,
      ) * 10000,
    feeBps: policy.feesBps[i.venue][i.kind],
  };
}
export function pairEconomics(
  strategy: Strategy,
  a: MarketSnapshot,
  b: MarketSnapshot,
  size: number,
  refs: ValuationReference[],
  policy: MarketPolicy,
  now: number,
  capacityCheck = false,
): SizeEconomics {
  const reserve =
    strategy === "FUNDING_NEUTRAL" || strategy === "CROSS_EXCHANGE_FUNDING"
      ? 0.02
      : 0;
  const base: SizeEconomics = {
    notionalUsd: size,
    roundedNotionalUsd: null,
    grossPct: null,
    entrySlippagePct: null,
    expectedCostPct: null,
    reservePct: reserve,
    netPct: null,
    expectedPnlUsd: null,
    annualizedComparisonPct: null,
    deltaMismatchPct: null,
    publicGatesPass: false,
    reasonCodes: [],
    legs: [],
  };
  const failures = base.reasonCodes;
  if (!a.book || !b.book) {
    failures.push("ORDER_BOOK_MISSING");
    return base;
  }
  const va = valuation(a, refs, now, policy),
    vb = valuation(b, refs, now, policy);
  if (va === null || vb === null) {
    failures.push("USD_VALUATION_MISSING");
    return base;
  }
  if (
    a.instrument.base !== b.instrument.base ||
    a.instrument.id === b.instrument.id
  ) {
    failures.push("INSTRUMENT_MAPPING_MISMATCH");
    return base;
  }
  const topA = a.book.asks[0][0],
    topB = b.book.bids[0][0];
  const targetBase = matchedBaseQuantity(a, b, size / (topA * va));
  if (targetBase <= 0) {
    failures.push("DEPTH_OR_MIN_ORDER_FAILED");
    return base;
  }
  const buy = exactLeg(a, "BUY", targetBase, va, policy),
    sell = exactLeg(b, "SELL", targetBase, vb, policy);
  if (!buy || !sell) {
    failures.push("DEPTH_OR_MIN_ORDER_FAILED");
    return base;
  }
  base.legs = [buy, sell];
  base.roundedNotionalUsd = buy.notionalUsd;
  const mismatch =
    ((Math.abs(buy.baseQuantity - sell.baseQuantity) * (topA * va)) / size) *
    100;
  base.deltaMismatchPct = mismatch;
  if (mismatch > 0.5) failures.push("ROUNDED_DELTA_MISMATCH");
  const ttl = freshness(strategy, a, b);
  if ([a, b].some((s) => !s.instrument.active))
    failures.push("INSTRUMENT_INACTIVE");
  if ([a, b].some((s) => now - s.instrument.metadataAt > 3600000))
    failures.push("INSTRUMENT_METADATA_STALE");
  if (
    [a, b].some(
      (s) =>
        now - s.book!.observedAt > ttl ||
        now - s.book!.receivedAt > ttl ||
        s.book!.observedAt > now + 5000,
    )
  )
    failures.push("ORDER_BOOK_STALE");
  if (Math.abs(a.book.observedAt - b.book.observedAt) > ttl)
    failures.push("BOOK_SNAPSHOT_SKEW");
  if ([a, b].some((s) => s.book!.timestampQuality === "RECEIPT_ONLY"))
    failures.push("BOOK_SOURCE_TIME_UNVERIFIED");
  const entrySlip =
    strategy === "BASIS_CASH_CARRY" || strategy === "CROSS_EXCHANGE_SPREAD"
      ? Math.max(
          0,
          ((topB * vb) / (topA * va) - 1) * 100 -
            ((sell.vwap * vb) / (buy.vwap * va) - 1) * 100,
        )
      : (buy.slippageBps + sell.slippageBps) / 100;
  base.entrySlippagePct = entrySlip;
  if (strategy === "CROSS_EXCHANGE_SPREAD") {
    if (buy.slippageBps > 5 || sell.slippageBps > 5)
      failures.push("PER_LEG_SLIPPAGE_LIMIT");
  } else if (entrySlip * 100 > (strategy === "FUNDING_NEUTRAL" ? 8 : 10))
    failures.push("ENTRY_SLIPPAGE_LIMIT");
  let gross = 0,
    days = 1,
    cost =
      entrySlip +
      (buy.feeBps + (sell.feeBps * sell.notionalUsd) / buy.notionalUsd) / 100;
  if (strategy === "CROSS_EXCHANGE_SPREAD") {
    gross = ((topB * vb) / (topA * va) - 1) * 100;
    days = 0.25;
    cost += 0.02; // Rebalance P75 fallback is an expected cost, not a paid fee.
  } else {
    const exitBuy = exactLeg(a, "SELL", buy.baseQuantity, va, policy),
      exitSell = exactLeg(b, "BUY", sell.baseQuantity, vb, policy);
    if (!exitBuy || (strategy !== "BASIS_CASH_CARRY" && !exitSell)) {
      failures.push("EXIT_DEPTH_MISSING");
      return base;
    }
    cost +=
      ((buy.feeBps * exitBuy.notionalUsd) / buy.notionalUsd +
        (sell.feeBps *
          (strategy === "BASIS_CASH_CARRY"
            ? sell.notionalUsd
            : exitSell!.notionalUsd)) /
          buy.notionalUsd) /
        100 +
      (exitBuy.slippageBps +
        (strategy === "BASIS_CASH_CARRY" ? 0 : exitSell!.slippageBps)) /
        100;
    if (strategy === "BASIS_CASH_CARRY") {
      if (!b.instrument.expiresAt) {
        failures.push("EXPIRY_MISSING");
        return base;
      }
      days = (b.instrument.expiresAt - now) / 86400000;
      gross = ((topB * vb) / (topA * va) - 1) * 100;
      if (days < 7 || days > 180) failures.push("EXPIRY_OUT_OF_RANGE");
      if (gross <= 0) failures.push("NEGATIVE_BASIS");
    } else {
      const fundingLegs = strategy === "FUNDING_NEUTRAL" ? [b] : [a, b];
      if (fundingLegs.some((s) => !s.funding)) {
        failures.push("FUNDING_EVIDENCE_MISSING");
        return base;
      }
      if (
        fundingLegs.some(
          (s) =>
            now - s.funding!.observedAt > 120000 ||
            s.funding!.observedAt > now + 5000,
        )
      )
        failures.push("FUNDING_STALE");
      if (fundingLegs.some((s) => !s.markPrice || !s.indexPrice)) {
        failures.push("MARK_INDEX_MISSING");
        return base;
      }
      if (strategy === "FUNDING_NEUTRAL") {
        const f = b.funding!;
        try {
          const estimator = conservativeFunding(
            f.rate,
            f.history.map((x) => x.rate),
          );
          if (estimator.persistence < 0.67)
            failures.push("FUNDING_PERSISTENCE_LOW");
          if (estimator.rate <= 0) failures.push("FUNDING_NOT_POSITIVE");
          const settlements = fundingSchedule(
            f.nextSettlementAt,
            f.intervalMs,
            now,
            now + 86400000,
          );
          const horizon = settlements[Math.min(2, settlements.length - 1)];
          if (!horizon) {
            failures.push("NO_FUNDING_SETTLEMENT");
            return base;
          }
          days = Math.max(8 / 24, (horizon - now) / 86400000);
          gross =
            (fundingOverHorizon(f, "SELL", now, now + days * 86400000).pct *
              b.markPrice! *
              vb) /
            (buy.vwap * va);
        } catch (e) {
          failures.push((e as Error).message);
          return base;
        }
        if (Math.abs(topB / topA - 1) * 100 > 0.75)
          failures.push("ENTRY_BASIS_LIMIT");
      } else {
        try {
          const paying = fundingOverHorizon(
              a.funding!,
              "BUY",
              now,
              now + 86400000,
            ),
            receiving = fundingOverHorizon(
              b.funding!,
              "SELL",
              now,
              now + 86400000,
            );
          gross =
            (paying.pct * a.markPrice! * va +
              receiving.pct * b.markPrice! * vb) /
            (buy.vwap * va);
          if (paying.eventCount + receiving.eventCount < 2)
            failures.push("INSUFFICIENT_SETTLEMENTS");
        } catch (e) {
          failures.push((e as Error).message);
          return base;
        }
        const premiumA = (a.markPrice! / a.indexPrice! - 1) * 100,
          premiumB = (b.markPrice! / b.indexPrice! - 1) * 100;
        if (Math.abs(premiumA - premiumB) > 0.5)
          failures.push("CROSS_VENUE_PREMIUM_LIMIT");
      }
    }
  }
  const net = round(gross - cost - reserve);
  base.grossPct = round(gross);
  base.expectedCostPct = round(cost);
  base.netPct = net;
  base.expectedPnlUsd = round((buy.notionalUsd * net) / 100, 6);
  base.annualizedComparisonPct = days > 0 ? (net * 365) / days : null;
  if (!capacityCheck) {
    const min =
      strategy === "FUNDING_NEUTRAL"
        ? 0.08
        : strategy === "BASIS_CASH_CARRY"
          ? 0.5
          : strategy === "CROSS_EXCHANGE_FUNDING"
            ? 0.1
            : 0.06;
    if (net < min) failures.push("NET_BELOW_MIN");
    if (strategy === "BASIS_CASH_CARRY" && base.annualizedComparisonPct! < 8)
      failures.push("ANNUALIZED_BELOW_MIN");
  }
  base.publicGatesPass = failures.length === 0;
  return base;
}
export function marketCapacity(
  strategy: Strategy,
  a: MarketSnapshot,
  b: MarketSnapshot,
  refs: ValuationReference[],
  policy: MarketPolicy,
  now: number,
): number | null {
  if (!a.book || !b.book) return null;
  const v = valuation(a, refs, now, policy);
  if (v === null) return null;
  const depth = Math.min(
    a.book.asks.reduce((s, l) => s + l[1], 0),
    b.book.bids.reduce((s, l) => s + l[1], 0),
  );
  let lo = 0,
    hi = depth * a.book.asks[0][0] * v;
  // Search depth/slippage feasibility separately from freshness, economics and private balances.
  for (let n = 0; n < 30; n++) {
    const mid = (lo + hi) / 2;
    const result = pairEconomics(strategy, a, b, mid, refs, policy, now, true);
    const structural = [
      "DEPTH_OR_MIN_ORDER_FAILED",
      "PER_LEG_SLIPPAGE_LIMIT",
      "ENTRY_SLIPPAGE_LIMIT",
      "EXIT_DEPTH_MISSING",
    ];
    if (
      result.legs.length === 2 &&
      !result.reasonCodes.some((c) => structural.includes(c))
    )
      lo = mid;
    else hi = mid;
  }
  const raw = lo * 0.95;
  const q = matchedBaseQuantity(
    a,
    b,
    Math.max(raw, 1e-12) / (a.book.asks[0][0] * v),
  );
  return q * a.book.asks[0][0] * v;
}
export function calculatePublicMarket(
  snapshots: MarketSnapshot[],
  refs: ValuationReference[],
  policy: MarketPolicy,
  now: number,
) {
  const pairs: { strategy: Strategy; a: MarketSnapshot; b: MarketSnapshot }[] =
    [];
  for (const a of snapshots)
    for (const b of snapshots) {
      if (
        a.instrument.base !== b.instrument.base ||
        a.instrument.id === b.instrument.id
      )
        continue;
      if (
        a.instrument.venue === b.instrument.venue &&
        a.instrument.kind === "SPOT" &&
        b.instrument.kind === "PERPETUAL"
      )
        pairs.push({ strategy: "FUNDING_NEUTRAL", a, b });
      if (
        a.instrument.venue === b.instrument.venue &&
        a.instrument.kind === "SPOT" &&
        b.instrument.kind === "FUTURE"
      )
        pairs.push({ strategy: "BASIS_CASH_CARRY", a, b });
      if (
        a.instrument.venue !== b.instrument.venue &&
        a.instrument.kind === "PERPETUAL" &&
        b.instrument.kind === "PERPETUAL"
      )
        pairs.push({ strategy: "CROSS_EXCHANGE_FUNDING", a, b });
      if (
        a.instrument.venue !== b.instrument.venue &&
        a.instrument.kind === "SPOT" &&
        b.instrument.kind === "SPOT"
      )
        pairs.push({ strategy: "CROSS_EXCHANGE_SPREAD", a, b });
    }
  const configHash = digest(policy),
    facts: PublicFact[] = [],
    traces: PublicTrace[] = [];
  const candidates = pairs.map(({ strategy, a, b }) => {
    const inputHash = digest({ a, b, refs, evaluationAt: now }),
      candidateId = `market-${digest({ strategy, a: a.instrument.id, b: b.instrument.id }).slice(0, 20)}`;
    const capacity = marketCapacity(strategy, a, b, refs, policy, now);
    const sizes = unique(
      [...policy.sizeBandsUsd, policy.referenceSizeUsd].map(String),
    )
      .map(Number)
      .sort((a, b) => a - b);
    const economics = sizes.map((size) => {
      const e = pairEconomics(strategy, a, b, size, refs, policy, now);
      if (capacity !== null && size > capacity) {
        e.reasonCodes.push("MARKET_CAPACITY_EXCEEDED");
        e.publicGatesPass = false;
      }
      return e;
    });
    const ref = economics.find(
      (e) => e.notionalUsd === policy.referenceSizeUsd,
    )!;
    let holdingSeconds =
      strategy === "BASIS_CASH_CARRY"
        ? Math.max(0, (b.instrument.expiresAt! - now) / 1000)
        : strategy === "CROSS_EXCHANGE_SPREAD"
          ? 21600
          : 86400;
    if (strategy === "FUNDING_NEUTRAL" && b.funding) {
      const events = fundingSchedule(
        b.funding.nextSettlementAt,
        b.funding.intervalMs,
        now,
        now + 86400000,
      );
      if (events.length)
        holdingSeconds = Math.max(
          28800,
          (events[Math.min(2, events.length - 1)] - now) / 1000,
        );
    }
    const minimum = strategy === "CROSS_EXCHANGE_SPREAD" ? 2000 : 5000;
    const reasonCodes = unique([
      ...ref.reasonCodes,
      ...(capacity !== null && capacity < minimum
        ? ["CAPACITY_BELOW_MIN"]
        : []),
    ]);
    const stale = reasonCodes.some(
      (r) => r.includes("STALE") || r === "BOOK_SNAPSHOT_SKEW",
    );
    const incomplete = ref.netPct === null;
    const executionBlockers = [
      "ACCOUNT_NOT_CONNECTED",
      "ACTUAL_FEE_TIER_UNVERIFIED",
      "BALANCE_AND_INVENTORY_UNKNOWN",
      "VENUE_AND_ASSET_RISK_UNREVIEWED",
      "USD_VALUATION_REFERENCE_ONLY",
      "STRATEGY_NOT_PROMOTED",
      ...(strategy === "CROSS_EXCHANGE_SPREAD"
        ? []
        : ["MARGIN_AND_LIQUIDATION_UNKNOWN"]),
    ];
    const ttl = freshness(strategy, a, b);
    const freshUntil =
      Math.min(a.book?.observedAt ?? 0, b.book?.observedAt ?? 0) + ttl;
    const c: PublicCandidate = {
      id: candidateId,
      strategy,
      asset: a.instrument.base,
      title: `${a.instrument.base} · ${strategy}`,
      instrumentIds: [a.instrument.id, b.instrument.id],
      venues: unique([
        a.instrument.venue,
        b.instrument.venue,
      ]) as PublicCandidate["venues"],
      source: "PUBLIC_MARKET",
      status: incomplete
        ? "INCOMPLETE"
        : stale
          ? "STALE"
          : reasonCodes.length
            ? "REJECTED"
            : "WATCH",
      computedAt: now,
      freshUntil,
      holdingSeconds,
      marketCapacityUsd: capacity,
      executableCapacityUsd: null,
      economics,
      referenceSizeUsd: policy.referenceSizeUsd,
      netPct: ref.netPct,
      expectedPnlUsd: ref.expectedPnlUsd,
      reasonCodes,
      executionBlockers,
      executable: false,
      economicStatus: "UNPROVEN",
      strategyStatus: "DRAFT",
      assumptions: [
        "Fees are conservative configured FALLBACK estimates, not account rates",
        "USD amounts use observed Coinbase reference prices; not approved accounting valuation",
        "Exit slippage is modeled using current opposite-side depth; future exit is uncertain",
        "Expected PnL uses matched rounded base quantity and buy-side VWAP notional; funding notional is estimated at current mark prices",
        "Market capacity excludes unknown balances, inventory, margin and portfolio limits",
        ...(strategy === "CROSS_EXCHANGE_SPREAD"
          ? [
              "Rebalance expected cost fallback 0.02%; no transfer-after-detection",
            ]
          : [
              "Positive-funding / premium reserve fallback 0.02% where applicable",
            ]),
      ],
      inputHash,
      configHash,
      factIds: [],
    };
    const record = (value: unknown, metric: string) => {
      if (typeof value === "number") {
        const factId = `${candidateId}:${inputHash.slice(0, 12)}:${metric}`;
        c.factIds.push(factId);
        facts.push({
          factId,
          metric,
          value,
          unit: metric.endsWith("Usd")
            ? "USD_REFERENCE"
            : metric.endsWith("Pct")
              ? "PERCENTAGE_POINTS"
              : metric.endsWith("Bps")
                ? "BASIS_POINTS"
                : "NUMBER",
          quality: "DERIVED",
          computedAt: new Date(now).toISOString(),
          formulaId: strategy,
          formulaVersion: "1.0.4",
          inputSnapshotHash: inputHash,
          configHash,
          assumptions: c.assumptions,
        });
        traces.push({
          traceId: `trace:${factId}`,
          subjectId: c.id,
          formulaId: strategy,
          formulaVersion: "1.0.4",
          inputSnapshotHash: inputHash,
          outputFactId: factId,
          computedAt: new Date(now).toISOString(),
          configHash,
          expression: metric,
        });
      } else if (value && typeof value === "object")
        Object.entries(value).forEach(([k, v]) => record(v, `${metric}.${k}`));
    };
    record(economics, "economicsBySize");
    record(capacity, "marketCapacityUsd");
    record(holdingSeconds, "holdingSeconds");
    return c;
  });
  return { candidates, facts, traces };
}
export interface YieldTerms {
  productId: string;
  termsVersion: string;
  allowListed: boolean;
  assetRiskTier: string;
  ratePct: number;
  quoteType: "APR" | "APY";
  baselineRatePct: number;
  baselineQuoteType: "APR" | "APY";
  termDays: number;
  lockDays: number;
  redemptionHours: number;
  expectedCostPct: number;
  capacityUsd: number;
  observedAt: number;
  ttlMs: number;
  amountUsd: number;
}
export function evaluateYieldTerms(t: YieldTerms, now: number) {
  const required = [
    t.ratePct,
    t.baselineRatePct,
    t.termDays,
    t.lockDays,
    t.redemptionHours,
    t.expectedCostPct,
    t.capacityUsd,
    t.observedAt,
    t.ttlMs,
    t.amountUsd,
  ];
  if (
    !required.every(Number.isFinite) ||
    t.termDays <= 0 ||
    t.amountUsd <= 0 ||
    t.ratePct < 0 ||
    t.baselineRatePct < 0 ||
    t.expectedCostPct < 0 ||
    !["APR", "APY"].includes(t.quoteType) ||
    !["APR", "APY"].includes(t.baselineQuoteType)
  )
    throw new Error("INVALID_YIELD_TERMS");
  const product = termReturn(t.ratePct, t.termDays, t.quoteType),
    baseline = termReturn(t.baselineRatePct, t.termDays, t.baselineQuoteType),
    net = product - baseline - t.expectedCostPct,
    annualized = ((product - baseline) * 365) / t.termDays;
  const reasons: string[] = [];
  if (!t.allowListed || !t.productId || !t.termsVersion)
    reasons.push("YIELD_TERMS_NOT_APPROVED");
  if (!["A", "B"].includes(t.assetRiskTier))
    reasons.push("SETTLEMENT_ASSET_BLOCK");
  if (t.lockDays > 7 || t.redemptionHours > 24)
    reasons.push("REDEMPTION_LIMIT");
  if (now - t.observedAt > t.ttlMs || t.observedAt > now + 5000)
    reasons.push("YIELD_TERMS_STALE");
  if (net < 0.05 || annualized < 2)
    reasons.push("INCREMENTAL_RATE_OR_NET_BELOW_MIN");
  if (t.capacityUsd < t.amountUsd) reasons.push("NO_EXECUTABLE_CAPACITY");
  return {
    productTermReturnPct: product,
    baselineTermReturnPct: baseline,
    incrementalNetPct: net,
    annualizedIncrementalPctPoints: annualized,
    expectedIncrementalPnlUsd: (t.amountUsd * net) / 100,
    publicGatesPass: reasons.length === 0,
    reasonCodes: reasons,
    executable: false,
    executionBlockers: [
      "ACCOUNT_NOT_CONNECTED",
      "PRODUCT_SUBSCRIPTION_REQUIRES_PRIVATE_API",
      "STRATEGY_NOT_PROMOTED",
    ],
  };
}
