# Exchange Connector Contract

## Initial adapters

- `OKXAdapter`
- `BinanceAdapter`
- `BybitAdapter`
- `HyperliquidAdapter`

## Canonical interface

```ts
interface ExchangeConnector {
  getInstruments(): Promise<Instrument[]>;
  getTicker(symbol: CanonicalSymbol): Promise<Ticker>;
  getOrderBook(symbol: CanonicalSymbol, depth?: number): Promise<OrderBook>;
  subscribeMarketData(subs: MarketSubscription[]): AsyncIterable<MarketEvent>;
  getFunding(symbol: CanonicalSymbol): Promise<FundingSnapshot | null>;
  getFundingHistory(symbol: CanonicalSymbol, from: Date, to: Date): Promise<FundingRecord[]>;
  getFeeSchedule(account?: AccountRef): Promise<FeeSchedule>;

  getBalances(account: AccountRef): Promise<Balance[]>;
  getPositions(account: AccountRef): Promise<Position[]>;
  getOpenOrders(account: AccountRef): Promise<Order[]>;
  placeOrder(account: AccountRef, order: CanonicalOrder): Promise<OrderAck>;
  cancelOrder(account: AccountRef, order: OrderRef): Promise<OrderAck>;
  subscribePrivate(account: AccountRef): AsyncIterable<PrivateEvent>;
}
```

## Adapter requirements

- symbol mapping is explicit and versioned;
- decimal precision/tick/lot constraints are normalized before order creation;
- venue timestamps are preserved alongside server receive time;
- reconnect and sequence-gap recovery is mandatory;
- adapter must expose health and rate-limit state;
- private adapter can be disabled while public market data remains live;
- venue-specific errors map to canonical error classes.

## Credentials

CEX keys must have withdrawal disabled. Use separate read-only and trade credentials where operationally convenient. Hyperliquid wallet/agent authorization must be isolated from UI/browser storage.

## Reference URLs (verified 2026-09-19)

- OKX: https://www.okx.com/docs-v5/en/
- Binance Developers: https://developers.binance.com/
- Bybit V5: https://bybit-exchange.github.io/docs/v5/
- Hyperliquid: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
