import { VENUES, type Venue } from "./types";
/** Typed boundary for future authenticated adapters. No credentials are requested or accepted here. */
export interface AccountEvidence {
  venue: Venue;
  observedAt: number;
  balances: { asset: string; free: number; reserved: number }[];
  fees: { symbol: string; takerBps: number; makerBps: number }[];
  margins: {
    symbol: string;
    equityUsd: number;
    maintenanceMarginUsd: number;
    pendingFeeReserveUsd: number;
    markPrice: number;
    liquidationPrice: number | null;
  }[];
  permissions: { read: boolean; trade: boolean; withdraw: boolean };
}
export interface PrivateVenueAdapter {
  readonly venue: Venue;
  accountEvidence(): Promise<AccountEvidence>;
  positions(): Promise<unknown[]>;
  orders(): Promise<unknown[]>;
  fills(since: number): Promise<unknown[]>;
}
export const accountReadiness = () =>
  VENUES.map((venue) => ({
    venue,
    configured: false,
    readEnabled: false,
    tradeEnabled: false,
    withdrawEnabled: false,
    capabilities: {
      publicMarket: "IMPLEMENTED",
      accountBalances: "ACCOUNT_NOT_CONFIGURED",
      actualFees: "ACCOUNT_NOT_CONFIGURED",
      marginEvidence: "ACCOUNT_NOT_CONFIGURED",
      orders: "NOT_IMPLEMENTED",
    },
    executionBlockers: [
      "ACCOUNT_NOT_CONFIGURED",
      "PRIVATE_ADAPTER_NOT_IMPLEMENTED",
      "STRATEGY_NOT_PROMOTED",
    ],
  }));
