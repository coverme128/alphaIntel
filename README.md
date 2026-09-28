# Alpha Opportunity & Capital OS

按 `alpha-opportunity-capital-os-commercial-v1.0.7.zip` 实施的本地产品开发版。当前交付是 **公开市场研究 + PAPER 工作台**，不是通过商业实盘验收的 V1。原始规格完整保留在 `specs/`，未修改包内业务规则或擅自提升策略成熟度。

## 启动

需要 Node.js 20.19+、npm。

```sh
npm ci
npm run dev
```

打开 <http://127.0.0.1:4317>。服务仅绑定本机。“机会 → 公开市场”可连接四家交易所，无需 API Key。默认关注 BTC、ETH。

“今日 / 持仓 / 资金组合 / 绩效”仍使用独立 PAPER 账本，初始模拟资金 **100,000 USD**；“模拟场景”中的五类机会来自包内 Golden Fixtures，界面明确标记。公开市场候选不会自动进入模拟账户。

```sh
npm run check       # 自动测试 + TypeScript + 前端构建
npm run build
npm start           # 使用已构建的界面，本机预览
```

`PORT` 可设置端口，`ALPHA_DATA_DIR` 可设置本地数据目录。不要同时启动多个实例使用同一数据文件。`npm start` 只是构建产物运行方式，不表示具备生产或实盘资格。

## 可操作的功能

- **今日**：权益、可用资金、15% 储备、最多三条主要建议；保留现金是有效结果。
- **机会**：五类策略、资产/交易所搜索、Carry/Yield 筛选；逐层查看原因、成本、储备与公式追溯。
- **持仓**：确认模拟配置、服务端资金约束、请求幂等、退出模拟持仓。
- **资金组合**：交易所模拟资金清单、集中度限制、按规模和边际经济性进行建议配置。
- **绩效**：模拟账本及事件记录；真实经济状态保留 `UNPROVEN`，产品价值保留 `EVIDENCE_INSUFFICIENT`。
- **高级设置**：暂停/恢复新建仓，现有持仓始终可退出；CORE_ONLY / AI_ENHANCED 配置，未设置 AI 时确定性回退；四家交易所公开 REST 盘口诊断。
- **决策与分析导出**：唯一的分析导出为 v1.0.7 JSON，使用已生成的事实快照，AJV 校验，无凭据。

PAPER 账本中的金额均为模拟 USD；公开行情的美元金额使用实际观测的稳定币价格，仅作参考估值。默认输入没有真实成交、资金费结算或收益兑付，故平仓只记录明确标注的模拟成本，绝不将预期收益当作已实现利润。成本分半作为模拟入/退出成本是开发场景假设，不是真实交易所成交或手续费模型。规模曲线和风险参数同样为标注的固定模拟假设。


## 无账户的公开市场

在“机会 → 公开市场 · 实际数据”点击“连接公开市场”。支持 OKX、Binance、Bybit 的 USDT 现货、线性永续和可用交割合约，以及 Hyperliquid 永续；当前默认 BTC / ETH。盘口经 WebSocket 更新，费率和参考估值按 60 秒周期刷新。

自动计算资金费中性、期现基差、跨所资金费和跨所价差，包含实际结算时刻、历史分位数、合约乘数、双腿数量匹配、VWAP、费用估计、风险储备和各规模容量。两腿取整后的实际参考金额决定预期收益金额。数据过期、历史不足、深度不足均显示原因。闲置生息提供条款计算 API，不伪造私有产品利率。

```sh
ALPHA_PUBLIC_AUTOSTART=true ALPHA_ASSETS=BTC,ETH npm start
npm run market:check -- /tmp/alpha-public-market-snapshot.json
```

环境变量由启动 shell 提供，应用不自动加载 `.env`。市场参数和版本化费用假设在 `config/public-market.json`；修改后重启。没有账户时不需要任何密钥。费用假设不代表账户真实费率，公开估值不代表经过审批的 NAV。

接口、配置和计算口径见 [公开市场 API](docs/PUBLIC-MARKET-API.md)。唯一分析导出包含公开候选、精确计算输入、参数版本、事实与追溯，可确定性复算。所有公开候选保持 `DRAFT / UNPROVEN`，不具有下单权限。

## 目录

```text
src/domain/       确定性公式、分配约束、轮动规则与回放库
src/server/       本地 API、账本、审计、事实投影
src/market/       四交易所 REST / WebSocket、元数据、历史、真实行情计算
src/client/       中文 React 工作台、响应式布局
scripts/          离线回放、公开市场联网检查
specs/            原始 v1.0.7 产品包（含 SQL 和配置）
tests/            Golden Fixtures、服务端约束、持久化与 HTTP 集成测试
docs/             实施状态、架构决定、公开 API 来源
```

## 回放

```sh
npm run replay -- docs/replay-example.json /tmp/alpha-replay-report.json
```

输入必须按时间升序，显式提供数据来源、时间切分点和源快照 ID；输出包含 calibration/holdout、每帧结果和稳定报告哈希。此命令用于重算**已归一化经济输入**，尚不包含订单簿撮合、实际资金费结算或 30 天真实历史验收。回放报告是开发工具产物，不是新增用户分析导出格式。输出文件已存在时拒绝覆盖。

## 交付边界

详见 [实施与验收状态](docs/IMPLEMENTATION-STATUS.md)。当前不收集交易所密钥，不发送真实订单，不允许 ASSISTED/AUTO，不包含转账、自动退出监控或后台通知。

进入实盘还需要实现并验证：生产级行情一致性及长期恢复验收、PostgreSQL 事务账本、私有账户/加密凭据、双腿执行状态机和失败恢复、自动风控/退出与对账，并完成规定的历史回放、连续模拟和交易所测试。功能代码通过测试不等于这些时间和证据门槛已经通过。
