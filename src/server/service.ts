import { randomUUID } from "node:crypto";
import { Store, audit } from "./store";
import { hash, CONFIG_HASH, validateExport, validateAction } from "./contracts";
import { createScenario } from "./seed";
import {
  recommend,
  portfolio,
  allocationAllowed,
  sizeEconomics,
} from "../domain/portfolio";
import { round, productValue } from "../domain/calculations";
import type { Dashboard, State, Position, Fact, Trace } from "../domain/types";
export class DomainError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export class Service {
  private cached: Dashboard | null = null;
  constructor(
    public store: Store,
    private clock = () => Date.now(),
  ) {
    this.dashboard();
  }
  private stamp() {
    return new Date(this.clock()).toISOString();
  }
  dashboard(): Dashboard {
    const s = this.store.read(),
      now = this.clock(),
      { portfolio: p, actions } = recommend(s, now);
    const stateHash = hash(s);
    const performance = {
      economicStatus: "UNPROVEN",
      evidenceSource: "PAPER",
      liveDays: 0,
      closedTrades: s.positions.filter((p) => p.status === "CLOSED").length,
      realizedPnlUsd: p.realizedPnlUsd,
      runCostUsd: s.runCostUsd,
      benchmarkReturnPct: null,
      excessReturnPct: null,
      economicValueUsd: null,
      valuationCoveragePct: 0,
    };
    const value = productValue({
      liveDays: 0,
      valuationCoveragePct: 0,
      reconciled: true,
      runCostComplete: false,
    });
    const revision = hash({ events: s.events.at(-1)?.hash, now });
    const d: Dashboard = {
      revision,
      mode: "PAPER",
      intelligenceMode: s.intelligenceMode,
      killSwitch: s.killSwitch,
      portfolio: p,
      actions,
      opportunities: s.opportunities.map((o) => ({
        ...o,
        status: Date.parse(o.expiresAt) <= now ? "STALE" : o.status,
        qualified: o.qualified && Date.parse(o.expiresAt) > now,
      })),
      positions: s.positions,
      facts: s.facts,
      traces: s.traces,
      events: s.events,
      performance,
      productValue: value,
      createdAt: s.createdAt,
    };
    // Materialize numeric projections once; export only serializes this canonical snapshot.
    const projection = (v: unknown, ref: string) => {
      if (typeof v === "number") {
        const factId = `projection:${revision}:${ref}`;
        d.facts.push({
          factId,
          metric: ref,
          value: v,
          unit: ref.endsWith("Pct")
            ? "PERCENTAGE_POINTS"
            : ref.endsWith("Usd")
              ? "USD"
              : "COUNT",
          quality: "DERIVED",
          computedAt: this.stamp(),
          formulaId: "PAPER_PORTFOLIO_PROJECTION",
          formulaVersion: "1.0.4",
          inputSnapshotHash: stateHash,
          configHash: CONFIG_HASH,
          assumptions: [
            "PAPER_ONLY; numeric source: persisted scenario, paper ledger and allocator",
          ],
        });
        d.traces.push({
          traceId: `trace:${factId}`,
          subjectId: ref,
          formulaId: "PAPER_PORTFOLIO_PROJECTION",
          formulaVersion: "1.0.4",
          inputSnapshotHash: stateHash,
          outputFactId: factId,
          computedAt: this.stamp(),
          configHash: CONFIG_HASH,
          expression: ref,
        });
      } else if (v && typeof v === "object")
        Object.entries(v).forEach(([k, x]) => projection(x, `${ref}.${k}`));
    };
    projection(p, "portfolio");
    projection(actions, "capitalActions");
    projection(performance, "performance");
    projection(s.positions, "positions");
    for (const a of actions)
      if (!validateAction(a)) throw new Error("INVALID_ACTION_SCHEMA");
    this.cached = d;
    return d;
  }
  execute(input: Record<string, unknown>) {
    if (input.mode !== "PAPER")
      throw new DomainError("LIVE_GATES_NOT_PASSED", 403);
    const { opportunityId, amountUsd, requestId } = input;
    if (
      typeof opportunityId !== "string" ||
      typeof amountUsd !== "number" ||
      !Number.isFinite(amountUsd) ||
      amountUsd < 100 ||
      Math.round(amountUsd * 100) !== amountUsd * 100 ||
      typeof requestId !== "string" ||
      !/^[\w-]{8,100}$/.test(requestId)
    )
      throw new DomainError("INVALID_ORDER");
    const signature = hash({ opportunityId, amountUsd, mode: input.mode }),
      now = this.stamp();
    const result = this.store.transaction((s) => {
      const prior = s.requests[requestId];
      if (prior) {
        if (prior.signature !== signature)
          throw new DomainError("IDEMPOTENCY_CONFLICT", 409);
        return s.positions.find((p) => p.id === prior.positionId)!;
      }
      if (s.killSwitch) throw new DomainError("KILL_SWITCH_ACTIVE", 409);
      const o = s.opportunities.find((o) => o.id === opportunityId);
      if (!o) throw new DomainError("OPPORTUNITY_NOT_FOUND", 404);
      if (!o.qualified || Date.parse(o.expiresAt) <= this.clock())
        throw new DomainError("OPPORTUNITY_NOT_EXECUTABLE", 409);
      const p = portfolio(s, this.clock()),
        held = s.positions
          .filter((p) => p.opportunityId === o.id && p.status === "OPEN")
          .reduce((n, p) => n + p.capitalUsd, 0),
        band = sizeEconomics(o, held + amountUsd);
      const entryFee = round((amountUsd * o.costPct) / 200, 6);
      if (
        !band ||
        !allocationAllowed(s, o, held + amountUsd, p) ||
        amountUsd + entryFee > p.availableUsd
      )
        throw new DomainError("ALLOCATION_LIMIT", 409);
      for (const venue of o.venues)
        if (
          (p.inventory.find((v) => v.venue === venue)?.readyUsd ?? 0) <
          (amountUsd + entryFee) / o.venues.length
        )
          throw new DomainError("VENUE_BALANCE_LIMIT", 409);
      const position: Position = {
        id: randomUUID(),
        opportunityId: o.id,
        title: o.title,
        asset: o.asset,
        strategy: o.strategy,
        venues: o.venues,
        capitalUsd: amountUsd,
        expectedPnlUsd: round((amountUsd * band.expectedNetPct) / 100, 6),
        openedAt: now,
        closedAt: null,
        status: "OPEN",
        mode: "PAPER",
        realizedPnlUsd: null,
        entryFeeUsd: entryFee,
        exitFeeUsd: 0,
        grossCashflowUsd: 0,
        requestId,
      };
      s.cashUsd = round(s.cashUsd - amountUsd - entryFee, 6);
      o.venues.forEach(
        (v) =>
          (s.venueCapital[v] = round(
            s.venueCapital[v] - entryFee / o.venues.length,
            6,
          )),
      );
      s.positions.push(position);
      s.requests[requestId] = { signature, positionId: position.id };
      audit(
        s,
        "PAPER_OPEN",
        position.id,
        {
          opportunityId,
          amountUsd,
          entryFeeUsd: entryFee,
          snapshotHash: o.snapshotHash,
          configHash: o.configHash,
          fillModel: "SYNTHETIC_FIXTURE_COST_SPLIT",
        },
        now,
      );
      return position;
    });
    this.dashboard();
    return result;
  }
  close(id: string) {
    const now = this.stamp();
    const result = this.store.transaction((s) => {
      const p = s.positions.find((p) => p.id === id);
      if (!p) throw new DomainError("POSITION_NOT_FOUND", 404);
      if (p.status === "CLOSED") return p;
      const o = s.opportunities.find((o) => o.id === p.opportunityId)!;
      // A voluntary paper exit books explicit modeled fees only. Expected return is NEVER realized automatically.
      p.exitFeeUsd = round((p.capitalUsd * o.costPct) / 200, 6);
      p.realizedPnlUsd = round(
        p.grossCashflowUsd - p.entryFeeUsd - p.exitFeeUsd,
        6,
      );
      p.status = "CLOSED";
      p.closedAt = now;
      s.cashUsd = round(
        s.cashUsd + p.capitalUsd + p.grossCashflowUsd - p.exitFeeUsd,
        6,
      );
      p.venues.forEach(
        (v) =>
          (s.venueCapital[v] = round(
            s.venueCapital[v] +
              (p.grossCashflowUsd - p.exitFeeUsd) / p.venues.length,
            6,
          )),
      );
      audit(
        s,
        "PAPER_CLOSE",
        p.id,
        {
          realizedPnlUsd: p.realizedPnlUsd,
          exitFeeUsd: p.exitFeeUsd,
          reason: "OWNER_EXIT",
          fillModel: "SYNTHETIC_FIXTURE_COST_SPLIT",
        },
        now,
      );
      return p;
    });
    this.dashboard();
    return result;
  }
  setKillSwitch(active: boolean) {
    this.store.transaction((s) => {
      s.killSwitch = active;
      audit(
        s,
        active ? "KILL_SWITCH_ON" : "KILL_SWITCH_OFF",
        "portfolio",
        {},
        this.stamp(),
      );
    });
    this.dashboard();
  }
  setIntelligence(mode: "CORE_ONLY" | "AI_ENHANCED") {
    this.store.transaction((s) => {
      s.intelligenceMode = mode;
      audit(
        s,
        "INTELLIGENCE_MODE_CHANGED",
        "settings",
        { mode, providerConfigured: false },
        this.stamp(),
      );
    });
    this.dashboard();
  }
  refreshScenario() {
    this.store.transaction((s) => {
      const fresh = createScenario(this.stamp());
      const heldIds = new Set(s.positions.map((p) => p.opportunityId));
      s.opportunities = [
        ...s.opportunities.filter((o) => heldIds.has(o.id)),
        ...fresh.opportunities,
      ];
      s.facts.push(...fresh.facts);
      s.traces.push(...fresh.traces);
      audit(
        s,
        "SCENARIO_REFRESH",
        "scenario",
        { source: "GOLDEN_FIXTURES_1.0.4" },
        this.stamp(),
      );
    });
    this.dashboard();
  }
  export() {
    const d = this.cached!;
    const payload = {
      metadata: {
        schemaVersion: "1.0.7",
        productVersion: "0.1.0-paper",
        generatedAt: this.stamp(),
        valuationCurrency: "USD",
        economicStatus: "UNPROVEN",
        productValueStatus: d.productValue.valueClassification,
        windowStart: d.createdAt,
        windowEnd: this.stamp(),
        configVersions: { formula: "1.0.4", policyHash: CONFIG_HASH },
        source: "SYNTHETIC_PAPER_SCENARIO",
        snapshotId: d.revision,
        sourceSnapshotHashes: d.opportunities.map((o) => o.snapshotHash),
        numericFactReferences: Object.fromEntries(
          d.facts.map((f) => [f.metric, f.factId]),
        ),
      },
      portfolio: d.portfolio,
      capitalActions: d.actions,
      opportunities: d.opportunities,
      positions: d.positions,
      performance: d.performance,
      riskFacts: [
        {
          killSwitch: d.killSwitch,
          liveExecutionEnabled: false,
          stressEvidence: "UNAVAILABLE",
          liquidationEvidence: "UNAVAILABLE",
        },
      ],
      calculationFacts: d.facts,
      calculationTraces: d.traces,
      productValue: d.productValue,
    };
    if (!validateExport(payload)) throw new Error("INVALID_EXPORT_SCHEMA");
    return payload;
  }
}
