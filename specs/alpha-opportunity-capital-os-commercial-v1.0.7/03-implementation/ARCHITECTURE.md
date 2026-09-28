# Reference Architecture

## Recommended stack

- TypeScript / Node.js;
- PostgreSQL;
- WebSocket-first market streams;
- REST for snapshots, metadata and recovery;
- Redis is optional at first; add only if stream fan-out/locks/queues require it;
- one deployable backend can host modular services initially; do not split into microservices prematurely.

## Logical modules

```text
Venue Adapters
  ├─ Public Market Data
  └─ Private Account/Trade
        ↓
Normalization + Freshness
        ↓
Market State Store
        ↓
Cost / Slippage / Capacity
        ↓
Strategy Registry + Modular Opportunity Engines
        ↓
Unified Opportunity Store
        ↓
Portfolio & Risk Policy
        ↓
Capital Rotation / Target Allocation
        ↓
Capital Action Plan
        ↓
Execution State Machine
        ↓
Position Monitor + Exit
        ↓
Reconciliation / Realized P&L

AI Explain/Query ── reads canonical objects only
```

## No-crawler critical path

Commercial V1 has no crawler dependency. Venue APIs/WebSockets are the authoritative live inputs. Optional future announcement/event ingestion is isolated from execution safety.

## Streaming rule

Use public WebSockets for order book/ticker/funding where supported, and private streams for order/fill/account state. REST snapshots initialize/recover state and validate gaps.

## Venue evidence snapshot (verified 2026-09)

- OKX official V5 docs recommend WebSocket for market data/order-book depth and expose current/historical funding, order books, mark price, open interest and trade functions.
- Binance official derivatives docs expose funding history and WebSocket market/user data streams; connections/rate limits must be handled explicitly.
- Bybit V5 exposes public spot/linear/inverse/options streams, private stream and WebSocket order entry.
- Hyperliquid official API exposes L2 books, historical/predicted funding, user fills/fees and WebSocket subscriptions.

External API details are mutable and must be wrapped behind adapters.


## v1.0.3 module boundary

`CARRY`, `YIELD`, `STRUCTURED`, and `OPTIONS` are internal modules behind the same canonical Opportunity boundary. Only CARRY/YIELD are implemented for live V1. STRUCTURED/OPTIONS are registered but execution/allocation disabled.
