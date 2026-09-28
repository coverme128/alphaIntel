import { evaluate, sharedRule, type Strategy } from "../domain/calculations";
import type { State, Opportunity, Fact, Trace } from "../domain/types";
import { readJson, hash, CONFIG_HASH } from "./contracts";
const labels: Record<Strategy, [string, string, string[], number]> = {
  FUNDING_NEUTRAL: ["ETH 资金费率中性", "ETH", ["OKX"], 1],
  BASIS_CASH_CARRY: ["BTC 期现基差", "BTC", ["Binance"], 90],
  CROSS_EXCHANGE_FUNDING: [
    "ETH 跨所资金费率",
    "ETH",
    ["Bybit", "Hyperliquid"],
    1,
  ],
  CROSS_EXCHANGE_SPREAD: ["BTC 跨所价差", "BTC", ["OKX", "Binance"], 0.25],
  IDLE_CAPITAL_YIELD: ["USDC 闲置资金生息", "USDC", ["Bybit"], 30],
};
export function createScenario(now: string): {
  opportunities: Opportunity[];
  facts: Fact[];
  traces: Trace[];
} {
  const fixtures = readJson(
    "02-domain-rules/golden/golden-fixtures.v1.0.4.json",
  ).strategyFixtures.filter((f: any) => f.class === "positive_qualification");
  const facts: Fact[] = [],
    traces: Trace[] = [];
  const opportunities = fixtures.map((fixture: any, index: number) => {
    const strategy = fixture.strategy as Strategy,
      [title, asset, venues, holdingDays] = labels[strategy],
      id = `${fixture.id}-${Date.parse(now)}`;
    const i = fixture.inputs,
      result = evaluate(strategy, i),
      snapshotHash = hash({ fixture, at: now }),
      factIds: string[] = [];
    // These are normative fixture economics, not observations of a live venue.
    const dimensions = [
      { score: 50, weight: 20, applicable: true },
      { score: 35, weight: 10, applicable: true },
      { score: 25, weight: 15, applicable: true },
    ];
    const risk = sharedRule("RISK_SCORING", { dimensions });
    const metrics = {
      grossPct: result.grossHoldingPeriodPct,
      costPct: i.expectedCostPct,
      reservePct: i.reservePct ?? 0,
      netPct: result.expectedNetPct,
      annualizedPct: (result.expectedNetPct * 365) / holdingDays,
      capacityUsd: i.capacityUsd,
      holdingDays,
      riskScore: risk.riskScore,
    };
    for (const [metric, value] of Object.entries(metrics)) {
      const factId = `${id}:${metric}`;
      factIds.push(factId);
      facts.push({
        factId,
        metric,
        value,
        unit: metric.endsWith("Pct")
          ? "PERCENTAGE_POINTS"
          : metric.endsWith("Usd")
            ? "USD"
            : metric === "holdingDays"
              ? "DAYS"
              : "SCORE",
        quality: "MODELED",
        computedAt: now,
        formulaId: strategy,
        formulaVersion: "1.0.4",
        inputSnapshotHash: snapshotHash,
        configHash: CONFIG_HASH,
        assumptions: [
          "GOLDEN_SCENARIO: synthetic paper inputs, not live market data",
          "Flat size curve is a PAPER-only fixture assumption",
          "Stress/liquidation evidence unavailable; live execution disabled",
        ],
      });
      traces.push({
        traceId: `trace:${factId}`,
        subjectId: id,
        formulaId: strategy,
        formulaVersion: "1.0.4",
        inputSnapshotHash: snapshotHash,
        outputFactId: factId,
        computedAt: now,
        configHash: CONFIG_HASH,
        expression:
          metric === "netPct"
            ? "grossHoldingPeriodPct - expectedCostPct - reservePct"
            : `Canonical scenario projection: ${metric}`,
      });
    }
    return {
      id,
      title,
      asset,
      venues,
      strategy,
      module: strategy === "IDLE_CAPITAL_YIELD" ? "YIELD" : "CARRY",
      inputs: i,
      ...metrics,
      qualified: result.qualified,
      reasonCodes: result.reasonCodes,
      status: result.status,
      riskLevel: risk.level,
      state: "DRAFT",
      economicStatus: "UNPROVEN",
      createdAt: now,
      expiresAt: new Date(Date.parse(now) + 30 * 60 * 1000).toISOString(),
      source: "GOLDEN_SCENARIO",
      factIds,
      bands: [1000, 5000, 10000, 25000, 50000, 100000]
        .filter((n) => n <= i.capacityUsd)
        .map((n) => ({
          notionalUsd: n,
          expectedNetPct: result.expectedNetPct,
          expectedPnlUsd: (n * result.expectedNetPct) / 100,
          qualifiedAtSize: result.qualified,
        })),
      snapshotHash,
      configHash: CONFIG_HASH,
      settlementAsset: "USDC",
      correlationGroup: asset === "USDC" ? "STABLE_YIELD" : `${asset}_NEUTRAL`,
      stressLossPct: null,
    } as Opportunity;
  });
  return { opportunities, facts, traces };
}
export function initialState(now = new Date().toISOString()): State {
  return {
    version: 1,
    createdAt: now,
    seedCapitalUsd: 100000,
    cashUsd: 100000,
    killSwitch: false,
    intelligenceMode: "CORE_ONLY",
    ...createScenario(now),
    positions: [],
    events: [],
    requests: {},
    venueCapital: {
      OKX: 30000,
      Binance: 30000,
      Bybit: 25000,
      Hyperliquid: 15000,
    },
    runCostUsd: 0,
  };
}
