import type { Strategy } from "../domain/calculations";
export const VENUES = ["OKX", "Binance", "Bybit", "Hyperliquid"] as const;
export type Venue = (typeof VENUES)[number];
export type MarketKind = "SPOT" | "PERPETUAL" | "FUTURE";
export interface Instrument {
  id: string;
  venue: Venue;
  symbol: string;
  base: string;
  quote: string;
  settlement: string;
  kind: MarketKind;
  model: "SPOT" | "LINEAR" | "INVERSE";
  quantityUnit: "BASE" | "CONTRACTS";
  basePerContract: number;
  qtyStep: number;
  minQty: number;
  minNotional: number;
  tickSize: number | null;
  active: boolean;
  expiresAt: number | null;
  fundingIntervalMs: number | null;
  metadataAt: number;
}
export interface OrderBook {
  instrumentId: string;
  bids: [number, number][];
  asks: [number, number][];
  observedAt: number;
  receivedAt: number;
  timestampQuality: "VENUE" | "RECEIPT_ONLY";
  source: "REST" | "WEBSOCKET";
  sequence: number | null;
}
export interface FundingObservation {
  at: number;
  rate: number;
}
export interface Funding {
  rate: number;
  nextSettlementAt: number;
  intervalMs: number;
  intervalSource: "VENUE" | "OBSERVED_HISTORY" | "VENUE_PROTOCOL";
  observedAt: number;
  history: FundingObservation[];
}
export interface MarketSnapshot {
  instrument: Instrument;
  book: OrderBook | null;
  markPrice: number | null;
  indexPrice: number | null;
  funding: Funding | null;
  errors: string[];
  receivedAt: number;
}
export interface ValuationReference {
  asset: string;
  usdPrice: number;
  observedAt: number;
  source: "COINBASE_PUBLIC_SPOT";
  quality: "REFERENCE_ONLY";
}
export interface MarketLeg {
  instrumentId: string;
  venue: Venue;
  symbol: string;
  side: "BUY" | "SELL";
  baseQuantity: number;
  venueQuantity: number;
  vwap: number;
  notionalUsd: number;
  slippageBps: number;
  feeBps: number;
}
export interface SizeEconomics {
  notionalUsd: number;
  roundedNotionalUsd: number | null;
  grossPct: number | null;
  entrySlippagePct: number | null;
  expectedCostPct: number | null;
  reservePct: number;
  netPct: number | null;
  expectedPnlUsd: number | null;
  annualizedComparisonPct: number | null;
  deltaMismatchPct: number | null;
  publicGatesPass: boolean;
  reasonCodes: string[];
  legs: MarketLeg[];
}
export interface PublicCandidate {
  id: string;
  strategy: Strategy;
  asset: string;
  title: string;
  instrumentIds: string[];
  venues: Venue[];
  source: "PUBLIC_MARKET";
  status: "WATCH" | "REJECTED" | "INCOMPLETE" | "STALE";
  computedAt: number;
  freshUntil: number;
  holdingSeconds: number;
  marketCapacityUsd: number | null;
  executableCapacityUsd: null;
  economics: SizeEconomics[];
  referenceSizeUsd: number;
  netPct: number | null;
  expectedPnlUsd: number | null;
  reasonCodes: string[];
  executionBlockers: string[];
  executable: false;
  economicStatus: "UNPROVEN";
  strategyStatus: "DRAFT";
  assumptions: string[];
  inputHash: string;
  configHash: string;
  factIds: string[];
}
export interface PublicFact {
  factId: string;
  metric: string;
  value: unknown;
  unit: string;
  quality: "OBSERVED" | "DERIVED" | "FALLBACK";
  computedAt: string;
  formulaId: string;
  formulaVersion: "1.0.4";
  inputSnapshotHash: string;
  configHash: string;
  assumptions: string[];
}
export interface PublicTrace {
  traceId: string;
  subjectId: string;
  formulaId: string;
  formulaVersion: "1.0.4";
  inputSnapshotHash: string;
  outputFactId: string;
  computedAt: string;
  expression: string;
  configHash: string;
}
export interface Connection {
  venue: Venue;
  state: "IDLE" | "CONNECTING" | "LIVE" | "DEGRADED";
  instrumentCount: number;
  lastSuccessAt: number | null;
  error: string | null;
  streamState: "STOPPED" | "CONNECTING" | "LIVE" | "RECOVERING";
  lastMessageAt: number | null;
}
export interface PublicMarketState {
  calculationInputs: {
    snapshots: MarketSnapshot[];
    valuations: ValuationReference[];
    evaluationAt: number | null;
  };
  version: 1;
  enabled: boolean;
  scanning: boolean;
  lastScanAt: number | null;
  computedAt: number | null;
  assets: string[];
  snapshots: MarketSnapshot[];
  valuations: ValuationReference[];
  candidates: PublicCandidate[];
  facts: PublicFact[];
  traces: PublicTrace[];
  connections: Connection[];
  errors: string[];
  yieldStatus: string;
  liveExecutionEnabled: false;
}
export interface MarketPolicy {
  version: string;
  sizeBandsUsd: number[];
  referenceSizeUsd: number;
  timeoutMs: number;
  pollIntervalMs: number;
  maxHistoryDays: number;
  feesBps: Record<Venue, { SPOT: number; PERPETUAL: number; FUTURE: number }>;
  valuationTtlMs: number;
}
