import { test } from "node:test";
import assert from "node:assert/strict";
import { rotationDecision, type RotationInput } from "../src/domain/rotation";
import { replay, type ReplayFrame } from "../src/domain/replay";
import { readJson } from "../src/server/contracts";
const baseline: RotationInput = {
  targetQualified: true,
  targetFresh: true,
  moduleEligible: true,
  sourceExitEligible: true,
  postTradeRiskPass: true,
  targetNetPct: 0.3,
  remainingCurrentNetPct: 0.1,
  exitCostPct: 0.02,
  entryCostPct: 0.02,
  rebalanceCostPct: 0,
  targetUtilityPerDay: 1.5,
  currentUtilityPerDay: 1,
  holdElapsedFraction: 0.5,
  rollingTurnoverPct: 5,
  proposedTurnoverPct: 10,
  emergencyRiskExit: false,
};
test("rotation accounts for switching cost and enforces all eligibility/churn guards", () => {
  assert.equal(rotationDecision(baseline).action, "ROTATE");
  for (const mutation of [
    { targetFresh: false },
    { moduleEligible: false },
    { sourceExitEligible: false },
    { postTradeRiskPass: false },
    { targetNetPct: 0.12 },
    { holdElapsedFraction: 0.1 },
    { rollingTurnoverPct: 20 },
    { targetUtilityPerDay: 1.1 },
  ])
    assert.equal(rotationDecision({ ...baseline, ...mutation }).action, "HOLD");
});
test("emergency reduction bypasses churn, never forces a new allocation", () => {
  assert.equal(
    rotationDecision({
      ...baseline,
      emergencyRiskExit: true,
      targetFresh: false,
      rollingTurnoverPct: 100,
    }).action,
    "EXIT",
  );
  assert.equal(
    rotationDecision({
      ...baseline,
      emergencyRiskExit: true,
      sourceExitEligible: false,
    }).action,
    "HOLD",
  );
});
test("replay is chronological, deterministic and never promotes synthetic evidence", () => {
  const f = readJson("02-domain-rules/golden/golden-fixtures.v1.0.4.json")
    .strategyFixtures[0];
  const frames: ReplayFrame[] = [0, 1, 2].map((day) => ({
    at: new Date(Date.UTC(2026, 0, 1 + day)).toISOString(),
    strategy: f.strategy,
    inputs: f.inputs,
    sourceSnapshotId: `scenario-${day}`,
  }));
  const report = replay(frames, "SYNTHETIC", frames[1].at);
  assert.equal(report.calibrationCount, 1);
  assert.equal(report.holdoutCount, 2);
  assert.equal(
    report.reportHash,
    replay(frames, "SYNTHETIC", frames[1].at).reportHash,
  );
  assert.equal(report.economicStatus, "UNPROVEN");
  assert.equal(report.historicalAcceptance, "EVIDENCE_INSUFFICIENT");
  assert.throws(
    () => replay([...frames].reverse(), "RECORDED", frames[1].at),
    /NON_CHRONOLOGICAL/,
  );
});
