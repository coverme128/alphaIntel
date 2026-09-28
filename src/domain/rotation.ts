/** v1.0.3 rotation policy. Emergency exits never allocate into an unqualified target. */
export interface RotationInput {
  targetQualified: boolean;
  targetFresh: boolean;
  moduleEligible: boolean;
  sourceExitEligible: boolean;
  postTradeRiskPass: boolean;
  targetNetPct: number;
  remainingCurrentNetPct: number;
  exitCostPct: number;
  entryCostPct: number;
  rebalanceCostPct: number;
  targetUtilityPerDay: number;
  currentUtilityPerDay: number;
  holdElapsedFraction: number;
  rollingTurnoverPct: number;
  proposedTurnoverPct: number;
  emergencyRiskExit: boolean;
}
export function rotationDecision(i: RotationInput) {
  const numbers = [
    i.targetNetPct,
    i.remainingCurrentNetPct,
    i.exitCostPct,
    i.entryCostPct,
    i.rebalanceCostPct,
    i.targetUtilityPerDay,
    i.currentUtilityPerDay,
    i.holdElapsedFraction,
    i.rollingTurnoverPct,
    i.proposedTurnoverPct,
  ];
  if (!numbers.every(Number.isFinite))
    return { action: "HOLD", reasonCodes: ["MISSING_ROTATION_FACTS"] };
  if (i.emergencyRiskExit)
    return {
      action: i.sourceExitEligible ? "EXIT" : "HOLD",
      reasonCodes: [
        i.sourceExitEligible
          ? "EMERGENCY_RISK_REDUCTION"
          : "SOURCE_EXIT_BLOCKED",
      ],
    };
  const rotationCostPct =
    i.exitCostPct + i.entryCostPct + i.rebalanceCostPct + 0.02;
  const incrementalNetPct =
    i.targetNetPct - i.remainingCurrentNetPct - rotationCostPct;
  const relativeUtilityImprovement =
    (i.targetUtilityPerDay - i.currentUtilityPerDay) /
    Math.max(Math.abs(i.currentUtilityPerDay), 1e-9);
  const reasonCodes: string[] = [];
  if (!i.targetQualified || !i.targetFresh || !i.moduleEligible)
    reasonCodes.push("TARGET_NOT_ELIGIBLE");
  if (!i.sourceExitEligible) reasonCodes.push("SOURCE_EXIT_BLOCKED");
  if (!i.postTradeRiskPass) reasonCodes.push("POST_TRADE_RISK_BLOCK");
  if (incrementalNetPct < 0.05 - 1e-10)
    reasonCodes.push("INCREMENTAL_NET_BELOW_MIN");
  if (relativeUtilityImprovement < 0.2)
    reasonCodes.push("UTILITY_IMPROVEMENT_BELOW_MIN");
  if (i.holdElapsedFraction < 0.25) reasonCodes.push("MIN_HOLD_NOT_REACHED");
  if (i.rollingTurnoverPct + i.proposedTurnoverPct > 25)
    reasonCodes.push("TURNOVER_LIMIT");
  return {
    action: reasonCodes.length ? "HOLD" : "ROTATE",
    rotationCostPct,
    incrementalNetPct,
    relativeUtilityImprovement,
    reasonCodes,
  };
}
