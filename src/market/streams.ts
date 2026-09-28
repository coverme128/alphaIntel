import WebSocket from "ws";
import { canonicalBook } from "./adapters";
import type { Instrument, OrderBook, Venue } from "./types";
/** Bybit sends full snapshots followed by absolute-size deltas; zero removes a level. */
export class DeltaBook {
  private bids = new Map<string, string>();
  private asks = new Map<string, string>();
  private sequence: number | null = null;
  update(data: { b: any[]; a: any[]; u: number }, type: string) {
    const sequence = Number(data.u);
    if (!Number.isFinite(sequence)) throw new Error("INVALID_BOOK_SEQUENCE");
    if (type === "snapshot" || sequence === 1) {
      this.bids.clear();
      this.asks.clear();
      this.sequence = null;
    } else if (this.sequence === null) throw new Error("SNAPSHOT_REQUIRED");
    if (this.sequence !== null && sequence <= this.sequence)
      throw new Error("OUT_OF_ORDER_BOOK");
    for (const [rows, map] of [
      [data.b, this.bids],
      [data.a, this.asks],
    ] as const)
      for (const [price, size] of rows) {
        if (
          !Number.isFinite(Number(price)) ||
          !Number.isFinite(Number(size)) ||
          Number(price) <= 0 ||
          Number(size) < 0
        )
          throw new Error("INVALID_DELTA");
        if (Number(size) === 0) map.delete(String(price));
        else map.set(String(price), String(size));
      }
    this.sequence = sequence;
    return { bids: [...this.bids], asks: [...this.asks], sequence };
  }
}
export type StreamStatus = {
  state: "CONNECTING" | "LIVE" | "RECOVERING" | "STOPPED";
  lastMessageAt: number | null;
  error: string | null;
};
interface Channel {
  url: string;
  instruments: Instrument[];
  subscribe?: unknown;
  protocol: "OKX" | "BINANCE_SPOT" | "BINANCE_FUTURES" | "BYBIT" | "HL";
}
export function streamChannels(instruments: Instrument[]): Channel[] {
  const out: Channel[] = [];
  const okx = instruments.filter((i) => i.venue === "OKX");
  if (okx.length)
    out.push({
      url: "wss://ws.okx.com:8443/ws/v5/public",
      instruments: okx,
      subscribe: {
        op: "subscribe",
        args: okx.map((i) => ({ channel: "books5", instId: i.symbol })),
      },
      protocol: "OKX",
    });
  for (const kind of ["SPOT", "DERIVATIVE"]) {
    const list = instruments.filter(
      (i) =>
        i.venue === "Binance" &&
        (kind === "SPOT" ? i.kind === "SPOT" : i.kind !== "SPOT"),
    );
    if (list.length)
      out.push({
        url: `wss://${kind === "SPOT" ? "stream.binance.com:9443" : "fstream.binance.com"}/stream?streams=${list.map((i) => `${i.symbol.toLowerCase()}@depth20@100ms`).join("/")}`,
        instruments: list,
        protocol: kind === "SPOT" ? "BINANCE_SPOT" : "BINANCE_FUTURES",
      });
  }
  for (const kind of ["spot", "linear"]) {
    const list = instruments.filter(
      (i) =>
        i.venue === "Bybit" &&
        (kind === "spot" ? i.kind === "SPOT" : i.kind !== "SPOT"),
    );
    if (list.length)
      out.push({
        url: `wss://stream.bybit.com/v5/public/${kind}`,
        instruments: list,
        subscribe: {
          op: "subscribe",
          args: list.map((i) => `orderbook.50.${i.symbol}`),
        },
        protocol: "BYBIT",
      });
  }
  const hl = instruments.filter((i) => i.venue === "Hyperliquid");
  if (hl.length)
    out.push({
      url: "wss://api.hyperliquid.xyz/ws",
      instruments: hl,
      protocol: "HL",
    });
  return out;
}
export class MarketStreams {
  private stopped = false;
  private channelStatuses = new Map<
    string,
    { venue: Venue; status: StreamStatus }
  >();
  private sockets = new Set<WebSocket>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  constructor(
    private onBook: (book: OrderBook) => void,
    private onStatus: (venue: Venue, status: StreamStatus) => void,
    private onInvalidate: (ids: string[]) => void,
  ) {}
  start(instruments: Instrument[]) {
    this.stopped = false;
    const channels = streamChannels(instruments);
    this.channelStatuses.clear();
    for (const channel of channels)
      this.channelStatuses.set(channel.url, {
        venue: channel.instruments[0].venue,
        status: { state: "CONNECTING", lastMessageAt: null, error: null },
      });
    for (const channel of channels) this.connect(channel, 0);
  }
  private status(channel: Channel, status: StreamStatus) {
    if (this.stopped) return;
    const venue = channel.instruments[0].venue;
    this.channelStatuses.set(channel.url, { venue, status });
    const channels = [...this.channelStatuses.values()]
      .filter((s) => s.venue === venue)
      .map((s) => s.status);
    this.onStatus(venue, aggregateStreamStatus(channels));
  }
  private later(fn: () => void, ms: number) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    timer.unref();
    this.timers.add(timer);
  }
  private connect(channel: Channel, attempt: number) {
    if (this.stopped) return;
    const venue = channel.instruments[0].venue;
    this.status(channel, {
      state: "CONNECTING",
      lastMessageAt: null,
      error: null,
    });
    const socket = new WebSocket(channel.url, {
      handshakeTimeout: 8000,
      maxPayload: 2_000_000,
    });
    this.sockets.add(socket);
    const delta = new Map<string, DeltaBook>();
    let last = Date.now(),
      dataReceived = false;
    socket.on("open", () => {
      if (channel.subscribe) socket.send(JSON.stringify(channel.subscribe));
      if (channel.protocol === "HL")
        channel.instruments.forEach((i) =>
          socket.send(
            JSON.stringify({
              method: "subscribe",
              subscription: { type: "l2Book", coin: i.symbol },
            }),
          ),
        );
    });
    socket.on("message", (raw) => {
      const receivedAt = Date.now();
      last = receivedAt;
      try {
        const text = raw.toString();
        if (text === "pong") return;
        const message = JSON.parse(text);
        if (message.event === "error" || message.success === false)
          throw new Error("STREAM_SUBSCRIPTION_REJECTED");
        let i: Instrument | undefined, book: OrderBook | undefined;
        if (channel.protocol === "OKX" && message.arg?.channel === "books5") {
          i = channel.instruments.find((i) => i.symbol === message.arg.instId);
          const r = message.data?.[0];
          if (i && r)
            book = canonicalBook(
              i,
              r.bids,
              r.asks,
              Number(r.ts),
              receivedAt,
              "WEBSOCKET",
              r.seqId === undefined ? null : Number(r.seqId),
            );
        } else if (channel.protocol.startsWith("BINANCE") && message.data) {
          i = channel.instruments.find(
            (i) => message.stream === `${i.symbol.toLowerCase()}@depth20@100ms`,
          );
          const r = message.data;
          if (i)
            book = canonicalBook(
              i,
              r.bids ?? r.b,
              r.asks ?? r.a,
              r.E ?? receivedAt,
              receivedAt,
              "WEBSOCKET",
              r.lastUpdateId ?? r.u ?? null,
              r.E ? "VENUE" : "RECEIPT_ONLY",
            );
        } else if (
          channel.protocol === "BYBIT" &&
          message.topic?.startsWith("orderbook.")
        ) {
          i = channel.instruments.find((i) => i.symbol === message.data?.s);
          if (i) {
            const state = delta.get(i.id) ?? new DeltaBook();
            delta.set(i.id, state);
            const r = state.update(message.data, message.type);
            book = canonicalBook(
              i,
              r.bids,
              r.asks,
              Number(message.cts ?? message.ts),
              receivedAt,
              "WEBSOCKET",
              r.sequence,
            );
          }
        } else if (channel.protocol === "HL" && message.channel === "l2Book") {
          const r = message.data;
          i = channel.instruments.find((i) => i.symbol === r.coin);
          if (i)
            book = canonicalBook(
              i,
              r.levels[0].map((l: any) => [l.px, l.sz]),
              r.levels[1].map((l: any) => [l.px, l.sz]),
              Number(r.time),
              receivedAt,
              "WEBSOCKET",
            );
        }
        if (book) {
          dataReceived = true;
          this.onBook(book);
          this.status(channel, {
            state: "LIVE",
            lastMessageAt: receivedAt,
            error: null,
          });
        }
      } catch (e) {
        this.status(channel, {
          state: "RECOVERING",
          lastMessageAt: receivedAt,
          error: (e as Error).message,
        });
        socket.terminate();
      }
    });
    socket.on("error", () =>
      this.status(channel, {
        state: "RECOVERING",
        lastMessageAt: null,
        error: "WEBSOCKET_UNAVAILABLE",
      }),
    );
    socket.on("close", () => {
      this.sockets.delete(socket);
      if (this.stopped) return;
      this.onInvalidate(channel.instruments.map((i) => i.id));
      this.status(channel, {
        state: "RECOVERING",
        lastMessageAt: null,
        error: "STREAM_RECONNECTING",
      });
      this.later(
        () => this.connect(channel, dataReceived ? 0 : attempt + 1),
        Math.min(30000, 1000 * 2 ** Math.min(attempt, 5)),
      );
    });
    const heartbeat = () => {
      if (this.stopped || socket.readyState === WebSocket.CLOSED) return;
      if (Date.now() - last > 30000) {
        socket.terminate();
        return;
      }
      if (socket.readyState === WebSocket.OPEN) {
        if (channel.protocol === "OKX") socket.send("ping");
        else if (channel.protocol === "BYBIT")
          socket.send(JSON.stringify({ op: "ping" }));
        else if (channel.protocol === "HL")
          socket.send(JSON.stringify({ method: "ping" }));
        else socket.ping();
      }
      this.later(heartbeat, 15000);
    };
    this.later(heartbeat, 15000);
  }
  stop() {
    this.stopped = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const socket of this.sockets) socket.terminate();
    this.sockets.clear();
  }
}

export function aggregateStreamStatus(channels: StreamStatus[]): StreamStatus {
  return {
    state: channels.every((s) => s.state === "LIVE")
      ? "LIVE"
      : channels.some((s) => s.state === "RECOVERING")
        ? "RECOVERING"
        : "CONNECTING",
    lastMessageAt: channels.every((s) => s.lastMessageAt !== null)
      ? Math.min(...channels.map((s) => s.lastMessageAt!))
      : null,
    error: channels.find((s) => s.error)?.error ?? null,
  };
}
