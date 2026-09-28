# 公开数据适配来源

官方文档核查及真实联网测试日期：2026-09-28。所有当前请求无账户凭据。

| 来源 | 已使用接口 / 通道 | 范围 |
| --- | --- | --- |
| [OKX V5](https://www.okx.com/docs-v5/en/) | public/instruments、market/books、public/mark-price、market/index-tickers、public/funding-rate、public/funding-rate-history；WS books5 | USDT spot / linear swap / 可用 futures；合约数量转基础币 |
| [Binance Spot](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams) | exchangeInfo、depth；WS depth20@100ms | 现货；盘口无源时间时标 RECEIPT_ONLY |
| [Binance USDⓈ-M](https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Exchange-Information) | exchangeInfo、depth、premiumIndex、fundingInfo、fundingRate；WS depth20@100ms | 线性永续 / 交割；fundingInfo 未给周期时从最近已结算记录推断，不硬编码 8 小时 |
| [Bybit V5](https://bybit-exchange.github.io/docs/v5/market/instrument) / [资金费](https://bybit-exchange.github.io/docs/v5/market/history-fund-rate) / [WS](https://bybit-exchange.github.io/docs/v5/websocket/public/orderbook) | instruments-info、tickers、orderbook、funding/history；WS orderbook.50 | spot / linear；绝对数量增量、删除、重置快照与乱序拒绝 |
| [Hyperliquid Info](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals) / [WS](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions) | meta、metaAndAssetCtxs、l2Book、fundingHistory；WS l2Book | 永续，协议小时结算；不冒充现货 |
| [Coinbase prices](https://docs.cdp.coinbase.com/coinbase-app/track-apis/prices) | /v2/prices/USDT-USD/spot、USDC-USD/spot | 实际观测稳定币美元参考价，REFERENCE_ONLY；不默认 1 USD |

REST：固定来源白名单、8 秒超时、请求合并/缓存、并发上限、限流退避及有限重试。WS：心跳、退避重连、重连重新订阅、断线盘口失效。OKX / Binance partial depth / Hyperliquid 使用快照通道；Bybit 合并增量。各交易所状态需所有订阅通道就绪，不能用一个活跃通道掩盖其他通道断线。

当前默认资产 BTC / ETH；不支持 inverse 合约、借币套利、链上转账或 Hyperliquid spot。交易所限制和地区网络限制会被展示为错误，不替换为演示数据。薄盘口容量为当前订阅深度内的保守结果，不等于整个交易所的流动性。
