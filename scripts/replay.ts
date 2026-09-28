import { readFileSync, writeFileSync } from "node:fs";
import { replay } from "../src/domain/replay";
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: npm run replay -- INPUT.json OUTPUT.json");
  process.exit(1);
}
const data = JSON.parse(readFileSync(input, "utf8"));
if (!["SYNTHETIC", "RECORDED"].includes(data.source))
  throw new Error("INVALID_REPLAY_SOURCE");
const report = replay(data.frames, data.source, data.splitAt);
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(
  `Replayed ${report.frameCount} frames; evidence: ${report.historicalAcceptance}; hash: ${report.reportHash}`,
);
