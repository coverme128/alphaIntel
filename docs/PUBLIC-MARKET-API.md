# 无账户公开市场接口与配置

服务仅绑定 127.0.0.1，默认端口 4317。无需交易所账户或 API Key。控制类 POST 使用 `Content-Type: application/json`、`X-Alpha-Client: owner-ui`，空参数发送 `{}`。

| 方法 / 路径 | 功能 |
| --- | --- |
| GET /api/public-market | 连接状态、市场快照、候选、各规模经济性；列表不附大体积计算事实 |
| POST /api/public-market/start | 首次发现工具并获取行情，开启 WebSocket 与定时刷新 |
| POST /api/public-market/stop | 停止采集与订阅；保留缓存及时间戳 |
| POST /api/public-market/refresh | 按需 REST 刷新；合并在途请求，10 秒冷却 |
| GET /api/public-market/candidates/:id | 候选、该次计算的准确输入、事实和追溯 |
| GET /api/public-market/history | 已结算资金费历史；参数 venue、instrumentId、start、end，时间为 Unix 毫秒，最长 90 天 |
| POST /api/calculations/yield | 显式条款下的 APR/APY、同期基准增量收益、成本、锁期/赎回/容量门槛 |
| GET /api/connections | 私有连接能力和缺失证据；当前均未配置 |
| GET /api/export | 唯一 v1.0.7 分析导出，合并 PAPER 与明确标记的 PUBLIC_MARKET 数据；导出不另算收益 |
| /api/private/:venue/:operation | 403 ACCOUNT_NOT_CONFIGURED；不接受密钥、不调用真实订单 |

## 配置

- `ALPHA_ASSETS=BTC,ETH`：工具发现的基础资产，最多 10 个；当前实测 BTC、ETH。
- `ALPHA_PUBLIC_AUTOSTART=true`：进程启动时开启公开采集；默认通过页面手动连接。
- `ALPHA_DATA_DIR`：原子 JSON 本地数据路径，默认 `.data`，禁止多进程共享写入。
- `PORT`：默认 4317。
- `config/public-market.json`：金额分档、5000 USD 参考规模、刷新周期、超时、估值 TTL、版本化费用假设。修改后重启。应用不自动读取 `.env`。

## 计算口径

工具元数据统一交易所数量单位和合约乘数；两腿先匹配可整除的基础币步长，再向下取整。逐档走盘口得到 VWAP 与滑点，预期收益金额按取整后的买入腿参考美元金额计算。手续费按每腿参考金额计入；未来退出价格/滑点使用当前盘口估计，费用和风险储备分开。

资金费方向区分付费/收费；使用最新最多 12 条历史（至少 8 条）和保守分位数，按各交易所实际下一结算时刻与周期计数，预估结算名义金额使用当前标记价格。基差按交割合约到期时间计算。价差按成交量匹配后的两侧 VWAP 计算，避免二次扣除滑点。容量仅反映订阅盘口、滑点上限及 95% 折减，账户余额/保证金未知时可执行容量始终为空。

规模输出同时给出请求参考金额 `notionalUsd` 与取整后的 `roundedNotionalUsd`。百分比以取整后买入腿参考金额为基数。不同策略的持有期不同，年化仅供对比。稳定币使用观测参考价格，不能自动用于正式 NAV。

每次计算保存不可变输入、评估时间、参数哈希、输入哈希及数字事实。导出 metadata 中的 `publicMarketInputs`、`valuationReferences`、`publicMarketPolicy` 和 `publicMarketAsOf` 可以传给 `calculatePublicMarket` 复算，已有集成测试保证一致。

闲置生息计算需显式提交 `productId, termsVersion, allowListed, assetRiskTier, ratePct, quoteType, baselineRatePct, baselineQuoteType, termDays, lockDays, redemptionHours, expectedCostPct, capacityUsd, observedAt, ttlMs, amountUsd`；quoteType 为 APR 或 APY，利率单位是百分数。条款由调用方提供，不自动等同于已验证交易所产品，也不会授予申购权限。

## 尚需账户或后续实现

私有适配当前仅定义类型边界与拒绝入口，尚未实现认证请求。账户余额、实际费率、持仓、保证金、强平距离和私有理财条款不能在无账户时验证。真实订单、撤单、成交对账、转账及实盘策略提升均未启用。公共候选始终 DRAFT / UNPROVEN / executable=false，与模拟账本隔离。

市场历史接口只提供资金费记录；它不证明有同步历史盘口、30 天全策略回测、7 天连续对账或真实利润。生产存储、访问控制及长期运行验收见 IMPLEMENTATION-STATUS.md。
