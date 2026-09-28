import type {
  Instrument,
  Venue,
  MarketSnapshot,
  ValuationReference,
} from "../market/types";
export type BookMode = "PAPER" | "MANUAL";
export type Side = "BUY" | "SELL";
export interface PersonalLeg {
  id: string;
  instrument: Instrument;
  side: Side;
  quantity: number;
  remaining: number;
  entryPrice: number;
  entryQuoteUsd: number;
  collateralUsd: number;
  feeBps: number;
}
export interface PersonalPosition {
  id: string;
  mode: BookMode;
  title: string;
  strategy: string;
  candidateId: string | null;
  openedAt: number;
  closedAt: number | null;
  legs: PersonalLeg[];
  stopLossUsd: number;
  takeProfitUsd: number;
  maxHoldHours: number;
  source: "PUBLIC_BOOK_SIMULATION" | "OWNER_REPORTED";
}
export interface Entry {
  id: string;
  at: number;
  mode: BookMode;
  type: "DEPOSIT" | "WITHDRAWAL" | "OPEN" | "CLOSE" | "FUNDING" | "FEE";
  venue: Venue;
  positionId: string | null;
  legId: string | null;
  cashDeltaUsd: number;
  capitalDeltaUsd: number;
  realizedPricePnlUsd: number;
  feeUsd: number;
  fundingUsd: number;
  externalFlowUsd: number;
  evidence: Record<string, unknown>;
}
export interface PersonalState {
  version: 1;
  createdAt: number;
  entries: Entry[];
  positions: PersonalPosition[];
  requests: Record<string, { hash: string; result: unknown }>;
  fees: Partial<
    Record<
      BookMode,
      Partial<
        Record<Venue, Partial<Record<"SPOT" | "PERPETUAL" | "FUTURE", number>>>
      >
    >
  >;
  marks: Record<string, { at: number; price: number; quoteUsd: number }[]>;
  nav: {
    at: number;
    mode: BookMode;
    equityUsd: number | null;
    netContributionsUsd: number;
  }[];
}
export interface Observation {
  snapshots: MarketSnapshot[];
  valuations: ValuationReference[];
}
export interface OpenInput {
  mode: BookMode;
  requestId: string;
  candidateId?: string;
  sizeUsd?: number;
  acknowledgeResearch?: boolean;
  title?: string;
  strategy?: string;
  at?: number;
  legs?: {
    instrumentId: string;
    side: Side;
    quantity: number;
    price: number;
    quoteUsd: number;
    feeUsd: number;
    collateralUsd?: number;
  }[];
  stopLossUsd?: number;
  takeProfitUsd?: number;
  maxHoldHours?: number;
}
