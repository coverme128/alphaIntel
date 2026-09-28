import {
  evaluate,
  STRATEGIES,
  type Inputs,
  type Strategy,
} from "./calculations";
import { createHash } from "node:crypto";
export interface ReplayFrame {
  at: string;
  strategy: Strategy;
  inputs: Inputs;
  sourceSnapshotId: string;
}
export function replay(
  frames: ReplayFrame[],
  source: "SYNTHETIC" | "RECORDED",
  splitAt: string,
) {
  if (!frames.length || frames.length > 100000)
    throw new Error("INVALID_REPLAY_LENGTH");
  const split = Date.parse(splitAt);
  if (!Number.isFinite(split)) throw new Error("INVALID_REPLAY_SPLIT");
  let previous = -Infinity;
  const results = frames.map((frame) => {
    const at = Date.parse(frame.at);
    if (
      !Number.isFinite(at) ||
      at < previous ||
      !STRATEGIES.includes(frame.strategy) ||
      !frame.sourceSnapshotId
    )
      throw new Error("INVALID_OR_NON_CHRONOLOGICAL_REPLAY");
    previous = at;
    return {
      at: frame.at,
      sourceSnapshotId: frame.sourceSnapshotId,
      strategy: frame.strategy,
      partition: at < split ? "CALIBRATION" : "HOLDOUT",
      result: evaluate(frame.strategy, frame.inputs),
    };
  });
  const days =
    (Date.parse(frames.at(-1)!.at) - Date.parse(frames[0].at)) / 86400000;
  const report = {
    formulaVersion: "1.0.4",
    source,
    observationDays: days,
    frameCount: frames.length,
    calibrationCount: results.filter((r) => r.partition === "CALIBRATION")
      .length,
    holdoutCount: results.filter((r) => r.partition === "HOLDOUT").length,
    qualifiedCount: results.filter((r) => r.result.qualified).length,
    softwareReplayStatus: "DETERMINISTIC",
    economicStatus: "UNPROVEN",
    historicalAcceptance: "EVIDENCE_INSUFFICIENT",
    limitations: [
      "Evaluates recorded canonical economics only; does not simulate synchronized book fills",
      "No automatic strategy promotion; 30-day historical acceptance also needs accounting and data-quality evidence",
    ],
    results,
  };
  return {
    ...report,
    reportHash: createHash("sha256")
      .update(JSON.stringify(report))
      .digest("hex"),
  };
}
