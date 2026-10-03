import { test } from "node:test";
import assert from "node:assert/strict";
import {
  candidateGroup,
  capitalEstimate,
  comparableAnnualized,
  simulationBlocker,
  networkMessage,
} from "../src/client/market-presentation";
import type { PublicCandidate, SizeEconomics } from "../src/market/types";
const economics: SizeEconomics = {
  notionalUsd: 1000,
  roundedNotionalUsd: 1000,
  grossPct: 2,
  entrySlippagePct: 0,
  expectedCostPct: 0.2,
  reservePct: 0.1,
  netPct: 1.7,
  expectedPnlUsd: 17,
  annualizedComparisonPct: null,
  deltaMismatchPct: 0,
  publicGatesPass: true,
  reasonCodes: [],
  legs: [
    {
      instrumentId: "a",
      venue: "OKX",
      symbol: "BTC",
      side: "BUY",
      baseQuantity: 1,
      venueQuantity: 1,
      vwap: 1000,
      notionalUsd: 1000,
      slippageBps: 0,
      feeBps: 10,
    },
    {
      instrumentId: "b",
      venue: "Bybit",
      symbol: "BTC",
      side: "SELL",
      baseQuantity: 1,
      venueQuantity: 1,
      vwap: 1005,
      notionalUsd: 1005,
      slippageBps: 0,
      feeBps: 5,
    },
  ],
};
const candidate: PublicCandidate = {
  id: "a-b",
  strategy: "FUNDING_NEUTRAL",
  asset: "BTC",
  title: "BTC",
  instrumentIds: ["a", "b"],
  venues: ["OKX", "Bybit"],
  source: "PUBLIC_MARKET",
  status: "WATCH",
  computedAt: 1000,
  freshUntil: 2000,
  holdingSeconds: 86400,
  marketCapacityUsd: 10000,
  executableCapacityUsd: null,
  economics: [economics],
  referenceSizeUsd: 1000,
  netPct: 1.7,
  expectedPnlUsd: 17,
  reasonCodes: [],
  executionBlockers: ["ACCOUNT_NOT_CONNECTED"],
  executable: false,
  economicStatus: "UNPROVEN",
  strategyStatus: "DRAFT",
  assumptions: [],
  inputHash: "input",
  configHash: "config",
  factIds: [],
};
test("expired or disconnected profitable candidates cannot stay in observation group", () => {
  assert.equal(candidateGroup(candidate, 1500), "WATCH");
  assert.equal(candidateGroup(candidate, 2001), "ATTENTION");
  assert.equal(candidateGroup(candidate, 1500, false), "ATTENTION");
  assert.equal(
    candidateGroup(
      { ...candidate, status: "REJECTED", reasonCodes: ["NET_BELOW_MIN"] },
      1500,
    ),
    "REJECTED",
  );
  assert.equal(
    candidateGroup(
      {
        ...candidate,
        status: "REJECTED",
        reasonCodes: ["NET_BELOW_MIN", "FUNDING_HISTORY_GAP"],
      },
      1500,
    ),
    "ATTENTION",
  );
});
test("capital includes both unequal legs and their entry fees", () => {
  assert.deepEqual(capitalEstimate(economics), {
    principal: 2005,
    entryFees: 1.5025,
    required: 2006.5025,
  });
  assert.equal(
    capitalEstimate({ ...economics, legs: economics.legs.slice(0, 1) }),
    null,
  );
});
test("cross-period comparison uses occupied capital, not single-leg notional", () => {
  assert.equal(comparableAnnualized(candidate), (17 / 2006.5025) * 100 * 365);
  assert.equal(
    comparableAnnualized({ ...candidate, holdingSeconds: 172800 }),
    comparableAnnualized(candidate)! / 2,
  );
  assert.equal(
    comparableAnnualized({ ...candidate, strategy: "CROSS_EXCHANGE_SPREAD" }),
    null,
  );
});
test("simulation permits negative research but blocks stale, missing and unsupported data", () => {
  const loss = {
    ...economics,
    netPct: -1,
    expectedPnlUsd: -10,
    publicGatesPass: false,
    reasonCodes: ["NET_BELOW_MIN"],
  };
  assert.equal(simulationBlocker(candidate, loss, 1500, true), null);
  assert.equal(
    simulationBlocker(candidate, loss, 2001, true),
    "ORDER_BOOK_STALE",
  );
  assert.equal(
    simulationBlocker(candidate, loss, 1500, false),
    "ORDER_BOOK_STALE",
  );
  assert.equal(
    simulationBlocker(
      candidate,
      { ...loss, reasonCodes: ["NET_BELOW_MIN", "FUNDING_STALE"] },
      1500,
      true,
    ),
    "FUNDING_STALE",
  );
  assert.equal(
    simulationBlocker(candidate, undefined, 1500, true),
    "MARKET_EVIDENCE_INCOMPLETE",
  );
  assert.equal(
    simulationBlocker(
      { ...candidate, strategy: "CROSS_EXCHANGE_SPREAD" },
      economics,
      1500,
      true,
    ),
    "SPOT_INVENTORY_UNSUPPORTED",
  );
});
test("smaller valid size can be researched even when reference size exceeds capacity", () => {
  assert.equal(
    simulationBlocker(
      {
        ...candidate,
        status: "INCOMPLETE",
        reasonCodes: ["MARKET_CAPACITY_EXCEEDED"],
      },
      economics,
      1500,
      true,
    ),
    null,
  );
  assert.equal(
    simulationBlocker(
      candidate,
      { ...economics, reasonCodes: ["MARKET_CAPACITY_EXCEEDED"] },
      1500,
      true,
    ),
    "MARKET_CAPACITY_EXCEEDED",
  );
});
test("network failure tells local users how to recover without hiding domain errors", () => {
  assert.match(networkMessage(new Error("Failed to fetch")), /本地服务/);
  assert.equal(networkMessage(new Error("模拟余额不足")), "模拟余额不足");
});
