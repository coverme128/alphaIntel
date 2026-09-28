# Official API Reference Snapshot — 2026-09-19

This is a reference snapshot, not a substitute for adapter contract tests.

- OKX API v5: https://www.okx.com/docs-v5/en/ and https://www.okx.com/docs-v5/agent_en/ — market/order book, funding rate/history, mark price, open interest, orders.
- Binance Derivatives developer docs: https://developers.binance.com/ — funding history/info, premium index/next funding time, derivatives market/order APIs.
- Bybit V5: https://bybit-exchange.github.io/docs/v5/ — funding history; instrument info exposes funding interval; tickers expose bid/ask and derivative metadata.
- Hyperliquid official docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/ — info endpoint, spot/perp data, user fills/orders and WebSocket APIs.

Adapter rule: funding interval and next funding timestamp are venue facts. Never hard-code every venue to 8 hours. API/schema changes require connector contract tests before resuming AUTO.
