export class MarketError extends Error {
  constructor(
    public code: string,
    public detail: string = "",
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }
}
export interface JsonTransport {
  get(url: string, body?: unknown, ttlMs?: number): Promise<any>;
}
/** Public, fixed-origin transport. Single flight, bounded concurrency, timeouts, backoff. No auth headers. */
export class PublicTransport implements JsonTransport {
  private cache = new Map<string, { until: number; value: any }>();
  private inFlight = new Map<string, Promise<any>>();
  private active = 0;
  private queue: (() => void)[] = [];
  private blocked = new Map<string, number>();
  constructor(
    private timeoutMs = 8000,
    private fetcher: typeof fetch = fetch,
  ) {}
  async get(url: string, body?: unknown, ttlMs = 0): Promise<any> {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      ![
        "www.okx.com",
        "api.binance.com",
        "fapi.binance.com",
        "api.bybit.com",
        "api.hyperliquid.xyz",
        "api.coinbase.com",
      ].includes(parsed.hostname)
    )
      throw new MarketError("UNAPPROVED_PUBLIC_ORIGIN");
    const key = url + JSON.stringify(body ?? null),
      saved = this.cache.get(key);
    if (saved && saved.until > Date.now()) return structuredClone(saved.value);
    if (this.inFlight.has(key)) return this.inFlight.get(key);
    const request = this.run(url, body, parsed.hostname)
      .then((value) => {
        if (ttlMs) this.cache.set(key, { until: Date.now() + ttlMs, value });
        if (this.cache.size > 500)
          this.cache.delete(this.cache.keys().next().value!);
        return structuredClone(value);
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }
  private async run(url: string, body: unknown, host: string) {
    if ((this.blocked.get(host) ?? 0) > Date.now())
      throw new MarketError("RATE_LIMIT_BACKOFF");
    if (this.active >= 6)
      await new Promise<void>((resolve) => this.queue.push(resolve));
    else this.active++;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        let res: Response;
        try {
          res = await this.fetcher(url, {
            method: body === undefined ? "GET" : "POST",
            ...(body === undefined
              ? {}
              : {
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                }),
            signal: AbortSignal.timeout(this.timeoutMs),
            redirect: "error",
          });
        } catch (e) {
          if (attempt === 0) continue;
          throw new MarketError("NETWORK_UNAVAILABLE", (e as Error).name);
        }
        if (res.status === 429 || res.status === 418) {
          const delay = Number(res.headers.get("retry-after"));
          this.blocked.set(
            host,
            Date.now() +
              (Number.isFinite(delay) && delay > 0
                ? Math.min(delay, 300) * 1000
                : 60000),
          );
          throw new MarketError("VENUE_RATE_LIMIT");
        }
        if (res.status >= 500 && attempt === 0) continue;
        if (!res.ok) throw new MarketError(`HTTP_${res.status}`);
        const raw = await res.text();
        if (raw.length > 12_000_000)
          throw new MarketError("RESPONSE_TOO_LARGE");
        let json: any;
        try {
          json = JSON.parse(raw);
        } catch {
          throw new MarketError("INVALID_JSON");
        }
        if (json.code !== undefined && String(json.code) !== "0")
          throw new MarketError("VENUE_ERROR", String(json.code));
        if (json.retCode !== undefined && json.retCode !== 0)
          throw new MarketError("VENUE_ERROR", String(json.retCode));
        return json;
      }
    } finally {
      const next = this.queue.shift();
      if (next) next();
      else this.active--;
    }
  }
}
export const num = (v: unknown): number => {
  if (v === null || v === undefined || v === "")
    throw new MarketError("MISSING_NUMERIC_FACT");
  const n = Number(v);
  if (!Number.isFinite(n)) throw new MarketError("INVALID_NUMERIC_FACT");
  return n;
};
export const positive = (v: unknown) => {
  const n = num(v);
  if (n <= 0) throw new MarketError("INVALID_POSITIVE_FACT");
  return n;
};
