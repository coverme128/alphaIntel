import type { State, Opportunity, Action, Portfolio } from "./types";
import { round } from "./calculations";
export function sizeEconomics(o: Opportunity, size: number) {
  if (!Number.isFinite(size) || size <= 0 || size > o.capacityUsd) return null;
  return (
    [...o.bands]
      .sort((a, b) => a.notionalUsd - b.notionalUsd)
      .find((b) => b.notionalUsd >= size && b.qualifiedAtSize) ?? null
  );
}
const current = (s: State, id: string) =>
  s.positions
    .filter((p) => p.status === "OPEN" && p.opportunityId === id)
    .reduce((n, p) => n + p.capitalUsd, 0);
export function portfolio(s: State, now: number): Portfolio {
  const opened = s.positions.filter((p) => p.status === "OPEN"),
    deployed = opened.reduce((n, p) => n + p.capitalUsd, 0),
    realized = s.positions.reduce(
      (n, p) =>
        n + (p.realizedPnlUsd ?? 0) - (p.status === "OPEN" ? p.entryFeeUsd : 0),
      0,
    ),
    equity = round(s.cashUsd + deployed, 6);
  const reserve = equity * 0.15;
  const inventory = Object.entries(s.venueCapital).map(([venue, totalUsd]) => {
    const used = opened
      .filter((p) => p.venues.includes(venue))
      .reduce((n, p) => n + p.capitalUsd / p.venues.length, 0);
    return { venue, totalUsd, readyUsd: totalUsd - used, allocatedUsd: used };
  });
  return {
    equityUsd: equity,
    deployedUsd: deployed,
    cashUsd: s.cashUsd,
    reserveUsd: reserve,
    availableUsd: Math.max(0, s.cashUsd - reserve),
    realizedPnlUsd: realized,
    monthlyRealizedPnlUsd: s.positions
      .filter(
        (p) =>
          p.closedAt &&
          p.closedAt.slice(0, 7) === new Date(now).toISOString().slice(0, 7),
      )
      .reduce((n, p) => n + (p.realizedPnlUsd ?? 0), 0),
    expectedPlanPnlUsd: 0,
    allocation: {},
    inventory,
  };
}
export function allocationAllowed(
  s: State,
  o: Opportunity,
  size: number,
  p: Portfolio,
  targets: Record<string, number> = {},
) {
  if (size > p.equityUsd * 0.1 + 1e-8) return false;
  const exposures = s.opportunities.map((x) => ({
    o: x,
    n: targets[x.id] ?? current(s, x.id),
  }));
  const amount = (f: (x: Opportunity) => boolean) =>
    exposures
      .filter((x) => x.o.id !== o.id && f(x.o))
      .reduce((n, x) => n + x.n, 0) + size;
  if (
    amount(() => true) > p.equityUsd * 0.85 + 1e-8 ||
    amount((x) => x.strategy === o.strategy) > p.equityUsd * 0.35 + 1e-8 ||
    amount((x) => x.asset === o.asset) > p.equityUsd * 0.4 + 1e-8 ||
    amount((x) => x.settlementAsset === o.settlementAsset) >
      p.equityUsd * 0.8 + 1e-8 ||
    amount((x) => x.correlationGroup === o.correlationGroup) >
      p.equityUsd * 0.4 + 1e-8
  )
    return false;
  for (const venue of o.venues) {
    const other = exposures
      .filter((x) => x.o.id !== o.id && x.o.venues.includes(venue))
      .reduce((n, x) => n + x.n / x.o.venues.length, 0);
    if (
      other + size / o.venues.length >
      Math.min(p.equityUsd * 0.4, s.venueCapital[venue] ?? 0) + 1e-8
    )
      return false;
  }
  return true;
}
export function recommend(s: State, now: number) {
  const p = portfolio(s, now),
    targets: Record<string, number> = {};
  s.opportunities.forEach((o) => (targets[o.id] = current(s, o.id)));
  const eligible = s.killSwitch
    ? []
    : s.opportunities.filter(
        (o) =>
          o.qualified && Date.parse(o.expiresAt) > now && o.state === "DRAFT",
      );
  const increment = p.equityUsd * 0.01;
  for (let step = 0; step < 85; step++) {
    let best: { o: Opportunity; size: number; score: number } | null = null;
    for (const o of eligible) {
      const before = targets[o.id],
        after = before + increment,
        band = sizeEconomics(o, after),
        previous = before ? sizeEconomics(o, before) : null;
      if (!band || !allocationAllowed(s, o, after, p, targets)) continue;
      const marginal =
        (after * band.expectedNetPct -
          before * (previous?.expectedNetPct ?? 0)) /
        increment;
      const floor =
        o.strategy === "CROSS_EXCHANGE_SPREAD"
          ? 0.25
          : o.strategy === "BASIS_CASH_CARRY"
            ? 7
            : o.strategy === "IDLE_CAPITAL_YIELD"
              ? 1
              : 0.5;
      const multiplier: Record<string, number> = {
        LOW: 1,
        MEDIUM_LOW: 0.85,
        MEDIUM: 0.65,
        MEDIUM_HIGH: 0.4,
        HIGH: 0,
      };
      const persistence =
        o.strategy === "FUNDING_NEUTRAL"
          ? o.inputs.positivePersistence
          : o.strategy === "BASIS_CASH_CARRY"
            ? 1
            : 0.7;
      const score =
        ((marginal * 100) / Math.max(o.holdingDays, floor)) *
        (multiplier[o.riskLevel] ?? 0) *
        persistence *
        0.7;
      if (score > 0 && (!best || score > best.score))
        best = { o, size: after, score };
    }
    if (!best) break;
    targets[best.o.id] = best.size;
  }
  const actions: Action[] = [];
  for (const o of eligible) {
    const size = round(targets[o.id] - current(s, o.id), 6);
    if (size < 1) continue;
    const band = sizeEconomics(o, targets[o.id]);
    actions.push({
      actionType: "EXECUTE",
      displayTitle: o.title,
      capitalUsd: size,
      expectedNetPnlUsd: (size * (band?.expectedNetPct ?? 0)) / 100,
      expectedNetPct: band?.expectedNetPct ?? null,
      modeledStressLossUsd: null,
      emergencyExitCostUsd: null,
      userRiskLabel: "中等 · 模拟风险参数",
      evidenceMaturity: "UNPROVEN",
      primaryReasonCode: "PAPER_SCENARIO_QUALIFIED",
      executionAvailability: "GUIDED",
      opportunityId: o.id,
      positionId: null,
      analysisFactsRef: o.factIds.find((f) => f.endsWith(":netPct")) ?? null,
      expiresAt: o.expiresAt,
    });
  }
  actions.sort(
    (a, b) =>
      Number(
        s.opportunities.find((o) => o.id === a.opportunityId)?.strategy ===
          "CROSS_EXCHANGE_SPREAD",
      ) -
        Number(
          s.opportunities.find((o) => o.id === b.opportunityId)?.strategy ===
            "CROSS_EXCHANGE_SPREAD",
        ) ||
      (b.expectedNetPct ?? 0) /
        (s.opportunities.find((o) => o.id === b.opportunityId)?.holdingDays ??
          1) -
        (a.expectedNetPct ?? 0) /
          (s.opportunities.find((o) => o.id === a.opportunityId)?.holdingDays ??
            1),
  );
  if (actions.length === 0)
    actions.push({
      actionType: p.deployedUsd ? "HOLD" : "KEEP_CASH",
      displayTitle: s.killSwitch
        ? "新建仓已暂停"
        : p.deployedUsd
          ? "保持当前配置"
          : "保留现金，等待合适机会",
      capitalUsd: p.cashUsd,
      expectedNetPnlUsd: null,
      expectedNetPct: null,
      modeledStressLossUsd: null,
      emergencyExitCostUsd: null,
      userRiskLabel: "维持现有风险敞口",
      evidenceMaturity: "UNPROVEN",
      primaryReasonCode: s.killSwitch
        ? "KILL_SWITCH_ACTIVE"
        : "NO_ELIGIBLE_INCREMENT",
      executionAvailability: "NONE",
      opportunityId: null,
      positionId: null,
      analysisFactsRef: null,
      expiresAt: null,
    });
  p.allocation = targets;
  p.expectedPlanPnlUsd = actions.reduce(
    (n, a) => n + (a.expectedNetPnlUsd ?? 0),
    0,
  );
  return { portfolio: p, actions: actions.slice(0, 3) };
}
