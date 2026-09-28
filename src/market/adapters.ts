import { type JsonTransport, num, positive, MarketError } from "./transport";
import type {
  Instrument,
  MarketSnapshot,
  OrderBook,
  Funding,
  FundingObservation,
  Venue,
  ValuationReference,
} from "./types";
const HOUR = 3600000,
  DAY = HOUR * 24;
const encode = encodeURIComponent;
const id = (v: Venue, symbol: string, kind: string) => `${v}:${kind}:${symbol}`;
export function normalizeInstrument(
  venue: Venue,
  r: any,
  kind: Instrument["kind"],
  now: number,
): Instrument {
  let base: string,
    quote: string,
    settlement: string,
    model: Instrument["model"] = kind === "SPOT" ? "SPOT" : "LINEAR",
    quantityUnit: Instrument["quantityUnit"] = "BASE",
    basePerContract = 1,
    qtyStep: number,
    minQty: number,
    minNotional: number,
    tickSize: number | null,
    active: boolean,
    expiresAt: number | null = null,
    fundingIntervalMs: number | null = null;
  const symbol = String(
    venue === "OKX" ? r.instId : venue === "Hyperliquid" ? r.name : r.symbol,
  );
  if (venue === "OKX") {
    base = r.baseCcy || r.uly?.split("-")[0] || symbol.split("-")[0];
    quote = r.quoteCcy || r.settleCcy;
    settlement = r.settleCcy || quote;
    if (kind !== "SPOT") {
      if (r.ctType !== "linear" || r.ctValCcy !== base)
        throw new MarketError("UNSUPPORTED_CONTRACT_MODEL");
      quantityUnit = "CONTRACTS";
      basePerContract = positive(r.ctVal) * positive(r.ctMult || 1);
    }
    qtyStep = positive(r.lotSz);
    minQty = positive(r.minSz);
    minNotional = 0;
    tickSize = positive(r.tickSz);
    active = r.state === "live";
    expiresAt = r.expTime ? num(r.expTime) : null;
  } else if (venue === "Binance") {
    base = r.baseAsset;
    quote = r.quoteAsset;
    settlement = r.marginAsset || quote;
    const lot = r.filters?.find((f: any) => f.filterType === "LOT_SIZE"),
      min = r.filters?.find((f: any) =>
        ["MIN_NOTIONAL", "NOTIONAL"].includes(f.filterType),
      ),
      price = r.filters?.find((f: any) => f.filterType === "PRICE_FILTER");
    qtyStep = positive(lot?.stepSize);
    minQty = positive(lot?.minQty);
    minNotional = positive(min?.minNotional ?? min?.notional);
    tickSize = positive(price?.tickSize);
    active = r.status === "TRADING";
    expiresAt = kind === "FUTURE" ? num(r.deliveryDate) : null;
  } else if (venue === "Bybit") {
    base = r.baseCoin;
    quote = r.quoteCoin;
    settlement = r.settleCoin || quote;
    const lot = r.lotSizeFilter;
    qtyStep = positive(kind === "SPOT" ? lot.basePrecision : lot.qtyStep);
    minQty = positive(lot.minOrderQty);
    minNotional = positive(
      kind === "SPOT" ? lot.minOrderAmt : lot.minNotionalValue,
    );
    tickSize = positive(r.priceFilter.tickSize);
    active = r.status === "Trading";
    expiresAt = kind === "FUTURE" ? num(r.deliveryTime) : null;
    fundingIntervalMs =
      kind === "PERPETUAL" ? positive(r.fundingInterval) * 60000 : null;
  } else {
    base = r.name;
    quote = "USDC";
    settlement = "USDC";
    const decimals = num(r.szDecimals);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 12)
      throw new MarketError("INVALID_SIZE_DECIMALS");
    qtyStep = Number(`1e-${decimals}`);
    minQty = qtyStep;
    minNotional = 10;
    tickSize = null;
    active = !r.isDelisted;
    fundingIntervalMs = HOUR;
  }
  if (!base || !quote) throw new MarketError("MISSING_ASSET_MAPPING");
  return {
    id: id(venue, symbol, kind),
    venue,
    symbol,
    base,
    quote,
    settlement,
    kind,
    model,
    quantityUnit,
    basePerContract,
    qtyStep,
    minQty,
    minNotional,
    tickSize,
    active,
    expiresAt,
    fundingIntervalMs,
    metadataAt: now,
  };
}
export function canonicalBook(
  i: Instrument,
  bids: any[],
  asks: any[],
  observedAt: number,
  receivedAt: number,
  source: OrderBook["source"] = "REST",
  sequence: number | null = null,
  quality: OrderBook["timestampQuality"] = "VENUE",
): OrderBook {
  const levels = (rows: any[], side: "bid" | "ask") => {
    if (!Array.isArray(rows) || !rows.length)
      throw new MarketError("EMPTY_BOOK");
    return rows
      .map(
        (r) =>
          [positive(r[0]), positive(r[1]) * i.basePerContract] as [
            number,
            number,
          ],
      )
      .sort((a, b) => (side === "bid" ? b[0] - a[0] : a[0] - b[0]));
  };
  const b = levels(bids, "bid"),
    a = levels(asks, "ask");
  if (
    b[0][0] >= a[0][0] ||
    !Number.isFinite(observedAt) ||
    observedAt > receivedAt + 5000
  )
    throw new MarketError("INVALID_BOOK");
  return {
    instrumentId: i.id,
    bids: b,
    asks: a,
    observedAt,
    receivedAt,
    timestampQuality: quality,
    source,
    sequence,
  };
}
export function normalizeHistory(
  rows: any[],
  venue: Venue,
  start: number,
  end: number,
): FundingObservation[] {
  const entries = rows.map((r) => ({
    at: num(
      venue === "Bybit"
        ? r.fundingRateTimestamp
        : venue === "Hyperliquid"
          ? r.time
          : r.fundingTime,
    ),
    rate: num(venue === "OKX" ? r.realizedRate : r.fundingRate),
  }));
  const map = new Map<number, number>();
  for (const r of entries) {
    if (r.at < start || r.at > end) continue;
    if (map.has(r.at) && map.get(r.at) !== r.rate)
      throw new MarketError("CONFLICTING_FUNDING_HISTORY");
    map.set(r.at, r.rate);
  }
  return [...map]
    .map(([at, rate]) => ({ at, rate }))
    .sort((a, b) => a.at - b.at);
}
export function observedInterval(history: FundingObservation[]) {
  const last = history.slice(-4);
  if (last.length < 4) throw new MarketError("FUNDING_SCHEDULE_UNKNOWN");
  const gaps = last.slice(1).map((x, n) => x.at - last[n].at);
  if (gaps.some((g) => g <= 0 || g !== gaps[0]))
    throw new MarketError("FUNDING_SCHEDULE_CHANGED");
  return gaps[0];
}
export class PublicAdapter {
  constructor(
    public venue: Venue,
    private http: JsonTransport,
  ) {}
  private okx(path: string, ttl = 0) {
    return this.http.get(`https://www.okx.com${path}`, undefined, ttl);
  }
  private binance(path: string, futures = false, ttl = 0) {
    return this.http.get(
      `https://${futures ? "fapi" : "api"}.binance.com${path}`,
      undefined,
      ttl,
    );
  }
  private bybit(path: string, ttl = 0) {
    return this.http.get(`https://api.bybit.com${path}`, undefined, ttl);
  }
  private hl(body: unknown, ttl = 0) {
    return this.http.get("https://api.hyperliquid.xyz/info", body, ttl);
  }
  async instruments(assets: string[]): Promise<Instrument[]> {
    const now = Date.now(),
      out: Instrument[] = [];
    if (this.venue === "OKX") {
      const groups = await Promise.all(
        ["SPOT", "SWAP", "FUTURES"].map((type) =>
          this.okx(`/api/v5/public/instruments?instType=${type}`, 1800000),
        ),
      );
      groups.forEach((g, n) =>
        g.data
          .filter(
            (r: any) =>
              assets.includes(r.baseCcy || r.uly?.split("-")[0]) &&
              (r.quoteCcy === "USDT" || r.settleCcy === "USDT"),
          )
          .forEach((r: any) =>
            out.push(
              normalizeInstrument(
                this.venue,
                r,
                (["SPOT", "PERPETUAL", "FUTURE"] as const)[n],
                now,
              ),
            ),
          ),
      );
    } else if (this.venue === "Binance") {
      const groups = await Promise.all([
        this.binance(
          `/api/v3/exchangeInfo?symbols=${encode(JSON.stringify(assets.map((a) => `${a}USDT`)))}`,
          false,
          1800000,
        ),
        this.binance("/fapi/v1/exchangeInfo", true, 1800000),
      ]);
      groups.forEach((g, n) =>
        g.symbols
          .filter(
            (r: any) => assets.includes(r.baseAsset) && r.quoteAsset === "USDT",
          )
          .forEach((r: any) =>
            out.push(
              normalizeInstrument(
                this.venue,
                r,
                n === 0
                  ? "SPOT"
                  : r.contractType === "PERPETUAL"
                    ? "PERPETUAL"
                    : "FUTURE",
                now,
              ),
            ),
          ),
      );
    } else if (this.venue === "Bybit") {
      const spot = await this.bybit(
        "/v5/market/instruments-info?category=spot",
        1800000,
      );
      spot.result.list
        .filter(
          (r: any) => assets.includes(r.baseCoin) && r.quoteCoin === "USDT",
        )
        .forEach((r: any) =>
          out.push(normalizeInstrument(this.venue, r, "SPOT", now)),
        );
      let cursor = "";
      for (let page = 0; page < 10; page++) {
        const response = await this.bybit(
          `/v5/market/instruments-info?category=linear&limit=1000${cursor ? `&cursor=${encode(cursor)}` : ""}`,
          1800000,
        );
        response.result.list
          .filter(
            (r: any) => assets.includes(r.baseCoin) && r.quoteCoin === "USDT",
          )
          .forEach((r: any) =>
            out.push(
              normalizeInstrument(
                this.venue,
                r,
                r.contractType === "LinearPerpetual" ? "PERPETUAL" : "FUTURE",
                now,
              ),
            ),
          );
        cursor = response.result.nextPageCursor;
        if (!cursor) break;
        if (page === 9) throw new MarketError("INSTRUMENT_PAGINATION_LIMIT");
      }
    } else {
      const meta = await this.hl({ type: "meta" }, 1800000);
      meta.universe
        .filter((r: any) => assets.includes(r.name))
        .forEach((r: any) =>
          out.push(normalizeInstrument(this.venue, r, "PERPETUAL", now)),
        );
    }
    return out.filter(
      (i) =>
        i.active &&
        (i.kind !== "FUTURE" ||
          (i.expiresAt !== null &&
            i.expiresAt > now &&
            i.expiresAt < now + 180 * DAY)),
    );
  }
  async book(i: Instrument): Promise<OrderBook> {
    const s = encode(i.symbol);
    if (this.venue === "OKX") {
      const r = (await this.okx(`/api/v5/market/books?instId=${s}&sz=50`))
        .data[0];
      return canonicalBook(
        i,
        r.bids,
        r.asks,
        num(r.ts),
        Date.now(),
        "REST",
        r.seqId ? num(r.seqId) : null,
      );
    }
    if (this.venue === "Binance") {
      const r = await this.binance(
        `${i.kind === "SPOT" ? "/api/v3" : "/fapi/v1"}/depth?symbol=${s}&limit=20`,
        i.kind !== "SPOT",
      );
      const now = Date.now();
      return canonicalBook(
        i,
        r.bids,
        r.asks,
        r.E ? num(r.E) : now,
        now,
        "REST",
        num(r.lastUpdateId),
        r.E ? "VENUE" : "RECEIPT_ONLY",
      );
    }
    if (this.venue === "Bybit") {
      const r = (
        await this.bybit(
          `/v5/market/orderbook?category=${i.kind === "SPOT" ? "spot" : "linear"}&symbol=${s}&limit=50`,
        )
      ).result;
      return canonicalBook(
        i,
        r.b,
        r.a,
        num(r.ts),
        Date.now(),
        "REST",
        num(r.u),
      );
    }
    const r = await this.hl({ type: "l2Book", coin: i.symbol });
    return canonicalBook(
      i,
      r.levels[0].map((x: any) => [x.px, x.sz]),
      r.levels[1].map((x: any) => [x.px, x.sz]),
      num(r.time),
      Date.now(),
    );
  }
  async history(
    i: Instrument,
    start: number,
    end: number,
  ): Promise<FundingObservation[]> {
    if (i.kind !== "PERPETUAL")
      throw new MarketError("NOT_A_FUNDING_INSTRUMENT");
    if (
      !Number.isFinite(start + end) ||
      start < 0 ||
      end <= start ||
      end - start > 90 * DAY ||
      end > Date.now() + 5000
    )
      throw new MarketError("INVALID_HISTORY_WINDOW");
    const all: FundingObservation[] = [];
    let from = start,
      to = end;
    for (let page = 0; page < 100; page++) {
      let raw: any[], limit: number;
      if (this.venue === "OKX") {
        limit = 100;
        raw = (
          await this.okx(
            `/api/v5/public/funding-rate-history?instId=${encode(i.symbol)}&after=${to + 1}&limit=100`,
            60000,
          )
        ).data;
      } else if (this.venue === "Binance") {
        limit = 1000;
        raw = await this.binance(
          `/fapi/v1/fundingRate?symbol=${encode(i.symbol)}&startTime=${from}&endTime=${end}&limit=1000`,
          true,
          60000,
        );
      } else if (this.venue === "Bybit") {
        limit = 200;
        raw = (
          await this.bybit(
            `/v5/market/funding/history?category=linear&symbol=${encode(i.symbol)}&startTime=${start}&endTime=${to}&limit=200`,
            60000,
          )
        ).result.list;
      } else {
        limit = 500;
        raw = await this.hl(
          {
            type: "fundingHistory",
            coin: i.symbol,
            startTime: from,
            endTime: end,
          },
          60000,
        );
      }
      if (!Array.isArray(raw)) throw new MarketError("INVALID_HISTORY");
      const rows = normalizeHistory(raw, this.venue, start, end);
      all.push(...rows);
      if (!raw.length || !rows.length || raw.length < limit) break;
      if (this.venue === "OKX" || this.venue === "Bybit") {
        const next = rows[0].at - 1;
        if (next >= to) throw new MarketError("HISTORY_CURSOR_STALLED");
        to = next;
        if (to < start) break;
      } else {
        const next = rows.at(-1)!.at + 1;
        if (next <= from) throw new MarketError("HISTORY_CURSOR_STALLED");
        from = next;
        if (from > end) break;
      }
      if (page === 99) throw new MarketError("HISTORY_PAGINATION_LIMIT");
    }
    return [...new Map(all.map((r) => [r.at, r])).values()].sort(
      (a, b) => a.at - b.at,
    );
  }
  async fundingAndMark(i: Instrument): Promise<{
    funding: Funding | null;
    markPrice: number | null;
    indexPrice: number | null;
  }> {
    if (i.kind === "SPOT")
      return { funding: null, markPrice: null, indexPrice: null };
    const now = Date.now(),
      s = encode(i.symbol);
    const history =
      i.kind === "PERPETUAL" ? await this.history(i, now - 7 * DAY, now) : [];
    let rate = 0,
      next = 0,
      interval = 0,
      observedAt = Date.now(),
      intervalSource: Funding["intervalSource"] = "VENUE",
      mark: number,
      index: number;
    if (this.venue === "OKX") {
      const results = await Promise.all([
        this.okx(
          `/api/v5/public/mark-price?instType=${i.kind === "PERPETUAL" ? "SWAP" : "FUTURES"}&instId=${s}`,
        ),
        this.okx(
          `/api/v5/market/index-tickers?instId=${encode(`${i.base}-${i.quote}`)}`,
        ),
        ...(i.kind === "PERPETUAL"
          ? [this.okx(`/api/v5/public/funding-rate?instId=${s}`)]
          : []),
      ]);
      mark = positive(results[0].data[0].markPx);
      index = positive(results[1].data[0].idxPx);
      if (i.kind === "PERPETUAL") {
        const f = results[2].data[0];
        rate = num(f.fundingRate);
        next = num(f.fundingTime);
        interval = num(f.nextFundingTime) - next;
        observedAt = num(f.ts);
      }
    } else if (this.venue === "Binance") {
      const r = await this.binance(`/fapi/v1/premiumIndex?symbol=${s}`, true);
      mark = positive(r.markPrice);
      index = positive(r.indexPrice);
      observedAt = num(r.time);
      if (i.kind === "PERPETUAL") {
        const info = (
          await this.binance("/fapi/v1/fundingInfo", true, 60000)
        ).find((x: any) => x.symbol === i.symbol);
        rate = num(r.lastFundingRate);
        next = num(r.nextFundingTime);
        interval = info
          ? positive(info.fundingIntervalHours) * HOUR
          : observedInterval(history);
        intervalSource = info ? "VENUE" : "OBSERVED_HISTORY";
      }
    } else if (this.venue === "Bybit") {
      const response = await this.bybit(
          `/v5/market/tickers?category=linear&symbol=${s}`,
        ),
        r = response.result.list[0];
      mark = positive(r.markPrice);
      index = positive(r.indexPrice);
      observedAt = num(response.time);
      if (i.kind === "PERPETUAL") {
        rate = num(r.fundingRate);
        next = num(r.nextFundingTime);
        interval = positive(i.fundingIntervalMs);
      }
    } else {
      const r = await this.hl({ type: "metaAndAssetCtxs" }, 1000),
        at = r[0].universe.findIndex((x: any) => x.name === i.symbol),
        ctx = r[1][at];
      if (!ctx) throw new MarketError("MISSING_MARK");
      mark = positive(ctx.markPx);
      index = positive(ctx.oraclePx);
      rate = num(ctx.funding);
      interval = HOUR;
      next = (Math.floor(Date.now() / HOUR) + 1) * HOUR;
      intervalSource = "VENUE_PROTOCOL";
    }
    if (
      i.kind === "PERPETUAL" &&
      (interval <= 0 ||
        interval > 24 * HOUR ||
        next <= Date.now() - 1000 ||
        next > Date.now() + 24 * HOUR)
    )
      throw new MarketError("INVALID_FUNDING_SCHEDULE");
    return {
      markPrice: mark,
      indexPrice: index,
      funding:
        i.kind === "PERPETUAL"
          ? {
              rate,
              nextSettlementAt: next,
              intervalMs: interval,
              intervalSource,
              observedAt,
              history,
            }
          : null,
    };
  }
  async snapshot(i: Instrument): Promise<MarketSnapshot> {
    const [book, derivative] = await Promise.allSettled([
      this.book(i),
      this.fundingAndMark(i),
    ]);
    const errors: string[] = [];
    if (book.status === "rejected") errors.push(`BOOK:${book.reason.message}`);
    if (derivative.status === "rejected")
      errors.push(`FUNDING_MARK:${derivative.reason.message}`);
    return {
      instrument: i,
      book: book.status === "fulfilled" ? book.value : null,
      ...(derivative.status === "fulfilled"
        ? derivative.value
        : { funding: null, markPrice: null, indexPrice: null }),
      errors,
      receivedAt: Date.now(),
    };
  }
}
export async function valuationReferences(
  http: JsonTransport,
): Promise<ValuationReference[]> {
  const results = await Promise.allSettled(
    ["USDT", "USDC"].map(async (asset) => {
      const r = await http.get(
        `https://api.coinbase.com/v2/prices/${asset}-USD/spot`,
      );
      if (r.data.base !== asset || r.data.currency !== "USD")
        throw new MarketError("INVALID_VALUATION_PAIR");
      return {
        asset,
        usdPrice: positive(r.data.amount),
        observedAt: Date.now(),
        source: "COINBASE_PUBLIC_SPOT" as const,
        quality: "REFERENCE_ONLY" as const,
      };
    }),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}
