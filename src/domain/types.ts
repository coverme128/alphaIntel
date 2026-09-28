import type { Strategy, Inputs } from "./calculations";
export interface Fact {
  factId: string;
  metric: string;
  value: unknown;
  unit: string;
  quality: "OBSERVED" | "DERIVED" | "MODELED" | "FALLBACK";
  computedAt: string;
  formulaId: string;
  formulaVersion: string;
  inputSnapshotHash: string;
  configHash: string;
  assumptions: string[];
}
export interface Trace {
  traceId: string;
  subjectId: string;
  formulaId: string;
  formulaVersion: string;
  inputSnapshotHash: string;
  outputFactId: string;
  computedAt: string;
  configHash: string;
  expression: string;
}
export interface Band {
  notionalUsd: number;
  expectedNetPct: number;
  expectedPnlUsd: number;
  qualifiedAtSize: boolean;
}
export interface Opportunity {
  id: string;
  title: string;
  asset: string;
  venues: string[];
  strategy: Strategy;
  module: "CARRY" | "YIELD";
  inputs: Inputs;
  grossPct: number;
  costPct: number;
  reservePct: number;
  netPct: number;
  holdingDays: number;
  annualizedPct: number;
  capacityUsd: number;
  qualified: boolean;
  reasonCodes: string[];
  status: string;
  riskLevel: string;
  riskScore: number;
  state: "DRAFT";
  economicStatus: "UNPROVEN";
  createdAt: string;
  expiresAt: string;
  source: "GOLDEN_SCENARIO";
  factIds: string[];
  bands: Band[];
  snapshotHash: string;
  configHash: string;
  settlementAsset: string;
  correlationGroup: string;
  stressLossPct: number | null;
}
export interface Position {
  id: string;
  opportunityId: string;
  title: string;
  asset: string;
  strategy: Strategy;
  venues: string[];
  capitalUsd: number;
  expectedPnlUsd: number;
  openedAt: string;
  closedAt: string | null;
  status: "OPEN" | "CLOSED";
  mode: "PAPER";
  realizedPnlUsd: number | null;
  entryFeeUsd: number;
  exitFeeUsd: number;
  grossCashflowUsd: number;
  requestId: string;
}
export interface Event {
  id: string;
  at: string;
  type: string;
  subjectId: string;
  details: Inputs;
  previousHash: string;
  hash: string;
}
export interface State {
  version: 1;
  createdAt: string;
  seedCapitalUsd: number;
  cashUsd: number;
  killSwitch: boolean;
  intelligenceMode: "CORE_ONLY" | "AI_ENHANCED";
  opportunities: Opportunity[];
  positions: Position[];
  facts: Fact[];
  traces: Trace[];
  events: Event[];
  requests: Record<string, { signature: string; positionId: string }>;
  venueCapital: Record<string, number>;
  runCostUsd: number;
}
export interface Action {
  actionType: "EXECUTE" | "HOLD" | "KEEP_CASH" | "EXIT" | "ROTATE";
  displayTitle: string;
  capitalUsd: number;
  expectedNetPnlUsd: number | null;
  expectedNetPct: number | null;
  modeledStressLossUsd: number | null;
  emergencyExitCostUsd: number | null;
  userRiskLabel: string;
  evidenceMaturity: "UNPROVEN";
  primaryReasonCode: string;
  executionAvailability: "GUIDED" | "NONE";
  opportunityId: string | null;
  positionId: string | null;
  analysisFactsRef: string | null;
  expiresAt: string | null;
}
export interface Portfolio {
  equityUsd: number;
  deployedUsd: number;
  cashUsd: number;
  reserveUsd: number;
  availableUsd: number;
  realizedPnlUsd: number;
  monthlyRealizedPnlUsd: number;
  expectedPlanPnlUsd: number;
  allocation: Record<string, number>;
  inventory: {
    venue: string;
    totalUsd: number;
    readyUsd: number;
    allocatedUsd: number;
  }[];
}
export interface Dashboard {
  revision: string;
  mode: "PAPER";
  intelligenceMode: "CORE_ONLY" | "AI_ENHANCED";
  killSwitch: boolean;
  portfolio: Portfolio;
  opportunities: Opportunity[];
  positions: Position[];
  actions: Action[];
  facts: Fact[];
  traces: Trace[];
  events: Event[];
  performance: Inputs;
  productValue: Inputs;
  createdAt: string;
}
