export type Venue = "OKX" | "Binance" | "Bybit" | "Hyperliquid";
export interface Book {
  venue: Venue;
  instrument: string;
  instrumentType: "SPOT" | "PERPETUAL";
  bids: [number, number][];
  asks: [number, number][];
  observedAt: string;
  receivedAt: string;
  timestampQuality: "VENUE" | "RECEIPT_ONLY";
  source: "PUBLIC_REST";
  executable: false;
}
export function normalizeBook(venue: Venue, raw: any, now = Date.now()): Book {
  let bids: any[],
    asks: any[],
    timestamp = now,
    quality: "VENUE" | "RECEIPT_ONLY" = "VENUE";
  if (venue === "OKX") {
    if (raw.code !== "0") throw new Error("VENUE_REJECTED");
    ({ bids, asks } = raw.data[0]);
    timestamp = Number(raw.data[0].ts);
  } else if (venue === "Binance") {
    ({ bids, asks } = raw);
    quality = "RECEIPT_ONLY";
  } else if (venue === "Bybit") {
    if (raw.retCode !== 0) throw new Error("VENUE_REJECTED");
    bids = raw.result.b;
    asks = raw.result.a;
    timestamp = raw.result.ts;
  } else {
    bids = raw.levels[0].map((l: any) => [l.px, l.sz]);
    asks = raw.levels[1].map((l: any) => [l.px, l.sz]);
    timestamp = raw.time;
  }
  const levels = (a: any[]): [number, number][] => {
    if (!Array.isArray(a) || !a.length) throw new Error("EMPTY_BOOK");
    return a.map((l) => {
      const p = Number(l[0]),
        q = Number(l[1]);
      if (!Number.isFinite(p) || !Number.isFinite(q) || p <= 0 || q <= 0)
        throw new Error("INVALID_BOOK");
      return [p, q];
    });
  };
  const b = levels(bids).sort((a, b) => b[0] - a[0]),
    a = levels(asks).sort((a, b) => a[0] - b[0]);
  if (
    b[0][0] >= a[0][0] ||
    !Number.isFinite(timestamp) ||
    timestamp > now + 5000 ||
    now - timestamp > 60000
  )
    throw new Error("INVALID_OR_STALE_BOOK");
  return {
    venue,
    instrument: venue === "Hyperliquid" ? "BTC/USD" : "BTC/USDT",
    instrumentType: venue === "Hyperliquid" ? "PERPETUAL" : "SPOT",
    bids: b,
    asks: a,
    observedAt: new Date(timestamp).toISOString(),
    receivedAt: new Date(now).toISOString(),
    timestampQuality: quality,
    source: "PUBLIC_REST",
    executable: false,
  };
}
export async function fetchBook(venue: Venue): Promise<Book> {
  const urls: Record<Venue, string> = {
    OKX: "https://www.okx.com/api/v5/market/books?instId=BTC-USDT&sz=20",
    Binance:
      "https://data-api.binance.vision/api/v3/depth?symbol=BTCUSDT&limit=20",
    Bybit:
      "https://api.bybit.com/v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=20",
    Hyperliquid: "https://api.hyperliquid.xyz/info",
  };
  const res = await fetch(urls[venue], {
    signal: AbortSignal.timeout(8000),
    ...(venue === "Hyperliquid"
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "l2Book", coin: "BTC" }),
        }
      : {}),
  });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return normalizeBook(venue, await res.json());
}
