import type { PublicCandidate, SizeEconomics } from "../market/types";
export type CandidateGroup = "WATCH" | "REJECTED" | "ATTENTION";
const evidenceCodes = new Set([
  "BOOK_SOURCE_TIME_UNVERIFIED",
  "ORDER_BOOK_MISSING",
  "USD_VALUATION_MISSING",
  "FUNDING_EVIDENCE_MISSING",
  "INSUFFICIENT_FUNDING_HISTORY",
  "FUNDING_HISTORY_GAP",
  "MARK_INDEX_MISSING",
  "BOOK_SNAPSHOT_SKEW",
  "INSTRUMENT_METADATA_STALE",
]);
export function candidateGroup(
  c: PublicCandidate,
  now: number,
  available = true,
): CandidateGroup {
  if (
    !available ||
    now > c.freshUntil ||
    c.status === "STALE" ||
    c.status === "INCOMPLETE" ||
    c.reasonCodes.some((r) => evidenceCodes.has(r) || r.includes("STALE"))
  )
    return "ATTENTION";
  return c.status === "WATCH" ? "WATCH" : "REJECTED";
}
export function capitalEstimate(e: SizeEconomics | undefined) {
  if (
    !e ||
    e.legs.length !== 2 ||
    !e.legs.every((l) => Number.isFinite(l.notionalUsd) && l.notionalUsd > 0)
  )
    return null;
  const principal = e.legs.reduce((n, l) => n + l.notionalUsd, 0),
    entryFees = e.legs.reduce(
      (n, l) => n + (l.notionalUsd * l.feeBps) / 10000,
      0,
    );
  return { principal, entryFees, required: principal + entryFees };
}
export function comparableAnnualized(c: PublicCandidate, e?: SizeEconomics) {
  const selected =
      e ?? c.economics.find((e) => e.notionalUsd === c.referenceSizeUsd),
    capital = capitalEstimate(selected);
  if (
    !capital ||
    selected?.expectedPnlUsd == null ||
    c.holdingSeconds <= 0 ||
    c.strategy === "CROSS_EXCHANGE_SPREAD"
  )
    return null;
  return (
    ((selected.expectedPnlUsd / capital.required) * 100 * 365 * 86400) /
    c.holdingSeconds
  );
}
export const duration = (seconds: number) =>
  seconds >= 172800
    ? `${(seconds / 86400).toFixed(1)} 天`
    : `${(seconds / 3600).toFixed(1)} 小时`;
export function networkMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch|network|load failed/i.test(message)
    ? "无法连接本地服务。请确认启动终端仍在运行，再点击重试。"
    : message;
}
const researchOnly = new Set([
  "NET_BELOW_MIN",
  "ANNUALIZED_BELOW_MIN",
  "FUNDING_PERSISTENCE_LOW",
  "FUNDING_NOT_POSITIVE",
  "NEGATIVE_BASIS",
  "ENTRY_BASIS_LIMIT",
  "CROSS_VENUE_PREMIUM_LIMIT",
]);
export function simulationBlocker(
  c: PublicCandidate,
  e: SizeEconomics | undefined,
  now: number,
  available: boolean,
) {
  if (!available || now > c.freshUntil) return "ORDER_BOOK_STALE";
  if (c.strategy === "CROSS_EXCHANGE_SPREAD")
    return "SPOT_INVENTORY_UNSUPPORTED";
  if (!e || e.legs.length !== 2 || e.netPct === null)
    return e?.reasonCodes[0] ?? "MARKET_EVIDENCE_INCOMPLETE";
  return e.reasonCodes.find((code) => !researchOnly.has(code)) ?? null;
}
