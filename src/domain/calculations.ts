/** Canonical v1.0.4 rules. Percent values are percentage points, never fractions. */
export type Inputs = Record<string, any>;
export const STRATEGIES = [
  "FUNDING_NEUTRAL",
  "BASIS_CASH_CARRY",
  "CROSS_EXCHANGE_FUNDING",
  "CROSS_EXCHANGE_SPREAD",
  "IDLE_CAPITAL_YIELD",
] as const;
export type Strategy = (typeof STRATEGIES)[number];
export const round = (n: number, digits = 10) => Number(n.toFixed(digits));
export function quantile(values: number[], q: number) {
  if (
    !values.length ||
    values.some((v) => !Number.isFinite(v)) ||
    q < 0 ||
    q > 1
  )
    throw new Error("INVALID_QUANTILE");
  const sorted = [...values].sort((a, b) => a - b),
    at = (sorted.length - 1) * q,
    lo = Math.floor(at);
  return sorted[lo] + (sorted[Math.ceil(at)] - sorted[lo]) * (at - lo);
}
export function conservativeFunding(current: number, history: number[]) {
  const rates = history.slice(-12);
  if (rates.length < 8) throw new Error("INSUFFICIENT_FUNDING_HISTORY");
  return {
    rate: Math.min(
      Math.max(current, 0),
      quantile(
        rates.map((v) => Math.max(v, 0)),
        0.25,
      ),
    ),
    persistence: rates.filter((v) => v > 0).length / rates.length,
  };
}
export function fundingSchedule(
  next: number,
  intervalMs: number,
  start: number,
  end: number,
) {
  if (
    intervalMs <= 0 ||
    end < start ||
    ![next, intervalMs, start, end].every(Number.isFinite)
  )
    throw new Error("INVALID_SCHEDULE");
  const out: number[] = [];
  for (
    let t =
      next + Math.max(0, Math.ceil((start - next) / intervalMs)) * intervalMs;
    t <= end;
    t += intervalMs
  ) {
    if (t > start) out.push(t);
    if (out.length > 10000) throw new Error("INVALID_SCHEDULE");
  }
  return out;
}
export function termReturn(ratePct: number, days: number, type: "APR" | "APY") {
  return type === "APR"
    ? (ratePct * days) / 365
    : ((1 + ratePct / 100) ** (days / 365) - 1) * 100;
}
export function walkBook(levels: [number, number][], quantity: number) {
  if (
    !(quantity > 0) ||
    !levels.length ||
    levels.some(([p, q]) => p <= 0 || q < 0 || !Number.isFinite(p + q))
  )
    throw new Error("INVALID_BOOK");
  let remaining = quantity,
    cost = 0;
  for (const [price, available] of levels) {
    const take = Math.min(remaining, available);
    cost += price * take;
    remaining -= take;
    if (remaining <= 1e-12) break;
  }
  return {
    filled: quantity - remaining,
    vwap: quantity - remaining > 0 ? cost / (quantity - remaining) : null,
    complete: remaining <= 1e-12,
  };
}
export function evaluate(strategy: Strategy, i: Inputs): Inputs {
  const reasons: string[] = [];
  const reject = (condition: boolean, code: string) => {
    if (condition) reasons.push(code);
  };
  const grossByStrategy: Record<Strategy, number> = {
    FUNDING_NEUTRAL: i.expectedFundingPct,
    BASIS_CASH_CARRY: i.grossBasisPct,
    CROSS_EXCHANGE_FUNDING: i.expectedFundingDifferentialPct,
    CROSS_EXCHANGE_SPREAD: i.grossSpreadPct,
    IDLE_CAPITAL_YIELD: i.productTermReturnPct - i.baselineTermReturnPct,
  };
  const gross = grossByStrategy[strategy];
  const required: Record<Strategy, string[]> = {
    FUNDING_NEUTRAL: ["positivePersistence", "absEntryBasisPct"],
    BASIS_CASH_CARRY: ["daysToExpiry"],
    CROSS_EXCHANGE_FUNDING: ["scheduledFundingEvents", "crossVenuePremiumPct"],
    CROSS_EXCHANGE_SPREAD: [],
    IDLE_CAPITAL_YIELD: [
      "annualizedIncrementalPctPoints",
      "lockDays",
      "redemptionHours",
    ],
  };
  reject(
    (required[strategy] ?? []).some((k) => !Number.isFinite(i[k])),
    "MISSING_STRATEGY_FACTS",
  );
  reject(
    i.expectedCostPct < 0 || (i.reservePct ?? 0) < 0,
    "INVALID_COST_FACTS",
  );
  const net = round(
    gross -
      i.expectedCostPct -
      (strategy === "IDLE_CAPITAL_YIELD" ? 0 : i.reservePct),
  );
  reject(
    !Number.isFinite(net) || !Number.isFinite(i.capacityUsd),
    "MISSING_REQUIRED_FACTS",
  );
  reject(!!i.stale, "STALE_REQUIRED_INPUT");
  reject(!!i.hardBlock, "HARD_RISK_BLOCK");
  const min: Record<Strategy, number> = {
    FUNDING_NEUTRAL: 0.08,
    BASIS_CASH_CARRY: 0.5,
    CROSS_EXCHANGE_FUNDING: 0.1,
    CROSS_EXCHANGE_SPREAD: 0.06,
    IDLE_CAPITAL_YIELD: 0.05,
  };
  const annualized =
    (net * 365) /
    (i.daysToExpiry ??
      i.holdingDays ??
      (strategy === "IDLE_CAPITAL_YIELD"
        ? 30
        : strategy === "CROSS_EXCHANGE_SPREAD"
          ? 0.25
          : 1));
  if (strategy === "IDLE_CAPITAL_YIELD") {
    reject(
      net < 0.05 || i.annualizedIncrementalPctPoints < 2,
      "INCREMENTAL_RATE_OR_NET_BELOW_MIN",
    );
    reject(i.capacityUsd <= 0, "NO_EXECUTABLE_CAPACITY");
    reject(i.lockDays > 7 || i.redemptionHours > 24, "REDEMPTION_LIMIT");
    reject(!["A", "B"].includes(i.riskTier), "SETTLEMENT_ASSET_BLOCK");
  } else {
    reject(net < min[strategy], "NET_BELOW_MIN");
    reject(
      i.capacityUsd < (strategy === "CROSS_EXCHANGE_SPREAD" ? 2000 : 5000),
      "CAPACITY_BELOW_MIN",
    );
  }
  if (strategy === "FUNDING_NEUTRAL") {
    reject(i.positivePersistence < 0.67, "FUNDING_PERSISTENCE_LOW");
    reject(i.absEntryBasisPct > 0.75, "ENTRY_BASIS_LIMIT");
  }
  if (strategy === "BASIS_CASH_CARRY") {
    reject(annualized < 8, "ANNUALIZED_BELOW_MIN");
    reject(i.daysToExpiry < 7 || i.daysToExpiry > 180, "EXPIRY_OUT_OF_RANGE");
    reject(gross <= 0, "NEGATIVE_BASIS");
  }
  if (strategy === "CROSS_EXCHANGE_FUNDING") {
    reject(i.scheduledFundingEvents < 2, "INSUFFICIENT_SETTLEMENTS");
    reject(Math.abs(i.crossVenuePremiumPct) > 0.5, "PREMIUM_LIMIT");
  }
  if (i.deltaMismatchPct !== undefined)
    reject(i.deltaMismatchPct > 0.5, "DELTA_MISMATCH");
  if (i.entrySlippageBps !== undefined)
    reject(
      i.entrySlippageBps > (strategy === "FUNDING_NEUTRAL" ? 8 : 10),
      "ENTRY_SLIPPAGE_LIMIT",
    );
  if (strategy === "CROSS_EXCHANGE_SPREAD" && i.maxLegSlippageBps !== undefined)
    reject(i.maxLegSlippageBps > 5, "LEG_SLIPPAGE_LIMIT");
  const qualified = reasons.length === 0;
  return {
    grossHoldingPeriodPct: gross,
    expectedNetPct: net,
    ...(strategy === "IDLE_CAPITAL_YIELD" ? { incrementalNetPct: net } : {}),
    annualizedNetPct: annualized,
    qualified,
    status: i.hardBlock
      ? "BLOCKED"
      : i.stale
        ? "STALE"
        : qualified
          ? "QUALIFIED"
          : "REJECTED",
    reasonCodes: reasons,
  };
}
export function evaluateExit(strategy: Strategy, i: Inputs): Inputs {
  if (strategy === "FUNDING_NEUTRAL" || strategy === "CROSS_EXCHANGE_FUNDING") {
    const fn = strategy === "FUNDING_NEUTRAL";
    const net = round(
      fn
        ? i.continuationFundingPct -
            i.modeledExitCostPct -
            i.remainingBasisReservePct
        : i.next8hFundingDifferentialPct -
            i.expectedExitCostPct -
            i.premiumDivergenceReservePct,
    );
    return {
      continuationNetPct: net,
      exitTriggered: net <= 0.02,
      reasonCodes:
        net <= 0.02
          ? [fn ? "CONTINUATION_NET_FLOOR" : "NEXT_8H_CONTINUATION_FLOOR"]
          : [],
    };
  }
  if (strategy === "BASIS_CASH_CARRY") {
    const fraction = i.executableClosePnlUsd / i.originalExpectedPnlUsd;
    return {
      realizationFraction: fraction,
      exitTriggered: fraction >= 0.8 && i.remainingAnnualizedPct < 6,
      reasonCodes: ["EARLY_REALIZATION_AND_LOW_REMAINING_RETURN"],
    };
  }
  if (strategy === "CROSS_EXCHANGE_SPREAD")
    return {
      exitTriggered: i.freshUntilPassed && !i.ordersSubmitted,
      status: "STALE",
      reasonCodes: ["OPPORTUNITY_EXPIRED"],
    };
  return {
    exitTriggered: !!i.termMatured,
    reasonCodes: ["TERM_MATURED_REDEEM_OR_ROLL_REEVALUATION"],
  };
}
export function sharedRule(rule: string, i: Inputs): Inputs {
  switch (rule) {
    case "RISK_SCORING": {
      const applicable = i.dimensions.filter((d: Inputs) => d.applicable);
      const w = applicable.reduce((s: number, d: Inputs) => s + d.weight, 0);
      if (!w) throw new Error("NO_RISK_DIMENSIONS");
      const score =
        applicable.reduce((s: number, d: Inputs) => s + d.score * d.weight, 0) /
        w;
      return {
        riskScore: score,
        level:
          score <= 20
            ? "LOW"
            : score <= 35
              ? "MEDIUM_LOW"
              : score <= 50
                ? "MEDIUM"
                : score <= 70
                  ? "MEDIUM_HIGH"
                  : "HIGH",
      };
    }
    case "MARGIN_LIQUIDATION": {
      const buffer =
          i.accountEquityUsd - i.maintenanceMarginUsd - i.pendingFeeReserveUsd,
        loss = (Math.abs(i.derivativeDeltaUsd) * i.stressMovePct) / 100,
        coverage =
          i.maintenanceMarginUsd > 0
            ? i.accountEquityUsd / i.maintenanceMarginUsd
            : Infinity;
      return {
        maintenanceCoverage: coverage,
        marginBufferUsd: buffer,
        stressLossUsd: loss,
        postStressMarginBufferUsd: buffer - loss,
        hardBlock:
          buffer - loss <= 0 ||
          coverage < 1.25 ||
          (i.liquidationDistancePct !== undefined &&
            i.liquidationDistancePct <= 2),
      };
    }
    case "INSTRUMENT_NORMALIZATION": {
      if (!(i.markPrice > 0)) throw new Error("INVALID_MARK");
      const usd =
        i.usdPerContract !== undefined
          ? i.contracts * i.usdPerContract
          : i.contracts * i.basePerContract * i.markPrice;
      return {
        [i.usdPerContract !== undefined
          ? "baseExposureApprox"
          : "baseExposure"]: (i.sideSign * usd) / i.markPrice,
        usdNotional: usd,
        deltaUsdApprox: i.sideSign * usd,
      };
    }
    case "ECONOMICS_BY_SIZE": {
      if (i.newSizeUsd <= i.oldSizeUsd)
        throw new Error("INVALID_SIZE_INCREMENT");
      const old = (i.oldSizeUsd * i.oldExpectedNetPct) / 100,
        n = (i.newSizeUsd * i.newExpectedNetPct) / 100;
      return {
        oldExpectedPnlUsd: old,
        newExpectedPnlUsd: n,
        marginalExpectedPnlUsd: n - old,
        marginalExpectedNetPct:
          ((n - old) / (i.newSizeUsd - i.oldSizeUsd)) * 100,
      };
    }
    case "PORTFOLIO_RETURN": {
      const pnl = i.allocations.reduce(
          (s: number, a: Inputs) =>
            s + (a.notionalUsd * a.expectedNetPct) / 100,
          0,
        ),
        days = i.allocations.reduce(
          (s: number, a: Inputs) => s + a.notionalUsd * a.effectiveLockDays,
          0,
        );
      return {
        expectedPlanPnlUsd: pnl,
        expectedPortfolioEquityImpactPct: (pnl / i.portfolioEquityUsd) * 100,
        capitalDays: days,
        capitalDayExpectedReturnPct: days ? (pnl / days) * 100 : 0,
        simpleAnnualizedComparisonPct: days ? (pnl / days) * 36500 : 0,
      };
    }
    case "VALUATION":
      return { usdValue: i.amount * i.canonicalUsdPrice };
    case "TWR": {
      if (
        i.subperiods.some((s: Inputs) => s.startNavUsd <= 0 || s.endNavUsd < 0)
      )
        throw new Error("INVALID_NAV");
      return {
        twrPct:
          (i.subperiods.reduce(
            (p: number, s: Inputs) => (p * s.endNavUsd) / s.startNavUsd,
            1,
          ) -
            1) *
          100,
      };
    }
    case "COST_RESERVE":
      return {
        expectedNetPct: round(i.grossPct - i.expectedCostsPct - i.reservesPct),
        realizedCostCannotIncludeReserveByDefault: true,
      };
    default:
      throw new Error(`UNKNOWN_RULE:${rule}`);
  }
}
export function economicValue(i: Inputs) {
  const excess = i.endingNavActualBeforeRunCost - i.endingNavBenchmark,
    ret = (excess / i.startingNav) * 100;
  return {
    excessValueBeforeRunCostUsd: excess,
    economicValueUsd: excess - i.runCostUsd,
    excessReturnPct: ret,
    valueToRunCostRatio: i.runCostUsd ? excess / i.runCostUsd : null,
    annualizationAllowed: i.observationDays >= 30,
    alphaThreshold3ppPass:
      i.observationDays >= 30 && (ret * 365) / i.observationDays >= 3,
    expansionThreshold5ppPass:
      i.observationDays >= 30 && (ret * 365) / i.observationDays >= 5,
  };
}
export function productValue(i: Inputs) {
  const drawdown =
    Math.abs(i.benchmarkMaxDrawdownPct) > 0
      ? ((Math.abs(i.benchmarkMaxDrawdownPct) -
          Math.abs(i.systemMaxDrawdownPct)) /
          Math.abs(i.benchmarkMaxDrawdownPct)) *
        100
      : null;
  if (
    !Number.isFinite(i.liveDays) ||
    !Number.isFinite(i.valuationCoveragePct) ||
    i.liveDays < 90 ||
    i.valuationCoveragePct < 95 ||
    i.reconciled !== true ||
    i.runCostComplete !== true
  )
    return {
      valueClassification: "EVIDENCE_INSUFFICIENT",
      expansionDecision: "NOT_EVALUATED",
      survivalDecision: "EVIDENCE_INSUFFICIENT",
    };
  const alpha = i.economicStatus === "ALPHA_VALIDATED",
    risk =
      i.annualizedReturnGapPctPoints >= -1 &&
      drawdown !== null &&
      drawdown >= 30 &&
      i.hardRiskBreaches === 0 &&
      i.severity1Incidents === 0 &&
      i.synchronizedWindow !== false;
  const auto =
    Math.abs(i.annualizedReturnGapPctPoints) <= 1 &&
    i.manualTimeReductionPct >= 70 &&
    i.annualizedHoursSaved >= 50 &&
    i.workloadEvidenceCoveragePct >= 60;
  const classification = alpha
    ? "ALPHA_PRODUCT_SUCCESS"
    : risk
      ? "RISK_CAPITAL_OS_VALUE"
      : auto
        ? "AUTOMATION_VALUE_ONLY"
        : "NO_MATERIAL_VALUE";
  const stop =
    classification === "NO_MATERIAL_VALUE" &&
    i.liveDays >= 120 &&
    i.annualizedExcessReturnPctPoints <= 0 &&
    (drawdown === null || drawdown < 10) &&
    (i.manualTimeReductionPct < 25 || i.annualizedHoursSaved < 20);
  return {
    relativeDrawdownReductionPct: drawdown,
    valueClassification: classification,
    expansionDecision:
      alpha && i.expansionWorthy ? "EXPANSION_WORTHY" : "DO_NOT_EXPAND",
    survivalDecision: alpha
      ? "CONTINUE"
      : stop
        ? "STOP_PRODUCT"
        : "KEEP_REDUCED_SCOPE",
  };
}
