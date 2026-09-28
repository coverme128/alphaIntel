# Calculation Rules Index v1.0.4

This is the normative index for all calculation domains used by launch V1 user decisions and AI analysis.

| Domain | Normative rule | Primary canonical outputs |
|---|---|---|
| Funding Neutral | `strategy-contracts/FUNDING-NEUTRAL-V1.md` | funding gross/net, persistence, entry/exit |
| Basis | `strategy-contracts/BASIS-CASH-CARRY-V1.md` | basis gross/net, days, annualized comparison |
| Cross-ex Funding | `strategy-contracts/CROSS-EXCHANGE-FUNDING-V1.md` | side-aware funding differential, premium reserve |
| Cross-ex Spread | `strategy-contracts/CROSS-EXCHANGE-SPREAD-V1.md` | top/VWAP spread, rebalance economics |
| Idle Yield | `strategy-contracts/IDLE-CAPITAL-YIELD-V1.md` | term return, baseline delta, redemption/lock |
| Instrument exposure | `shared-rules/INSTRUMENT-NORMALIZATION-V1.md` | canonical base exposure, USD delta, mismatch |
| Cost vs reserve | `shared-rules/COST-MODEL-V1.md` | expected costs, model reserves, expected net |
| Return semantics | `shared-rules/RETURN-NORMALIZATION-V1.md` | holding-period net, horizon, annualized comparison |
| Capacity | `shared-rules/CAPACITY-MODEL-V1.md` | max notional, economics by size, marginal net |
| Persistence | `shared-rules/PERSISTENCE-MODEL-V1.md` | persistence factor + sample evidence |
| Margin/liquidation | `shared-rules/MARGIN-LIQUIDATION-V1.md` | leverage, maintenance coverage, stress buffer, liq distance |
| Risk | `shared-rules/RISK-SCORING-V1.md` | applicable-weight score, level, hard blocks |
| Allocation | `shared-rules/CAPITAL-ALLOCATOR-V1.md` | marginal allocation score, target size |
| Rotation | `CAPITAL-ROTATION-v1.0.3.md` + v1.0.4 size facts | HOLD/ROTATE/ALLOCATE after switching cost |
| Portfolio expected return | `shared-rules/PORTFOLIO-RETURN-V1.md` | plan P&L, equity impact, capital-day comparison |
| Valuation | `shared-rules/VALUATION-POLICY-V1.md` | canonical USD price, fee/NAV conversion |
| Realized P&L | `shared-rules/PNL-ACCOUNTING-V1.md` | P&L components, realized net, model error |
| TWR / Alpha Proof | `economic-validation/TWR-CONTRACT-v1.0.4.md` | TWR, annualized TWR, excess TWR |
| Calculation provenance | `shared-rules/CALCULATION-TRACE-V1.md` | formula/version/input hash/config hash |
| Reason codes | `QUALIFICATION-REASON-CODES-v1.0.4.md` | deterministic qualification/exit/rotation reasons |

## Machine-readable runtime inputs

Use the v1.0.4 config files where a v1.0.4 equivalent exists. See `config/README-v1.0.4.md`.

## User/AI fact interfaces

- `schemas/opportunity-analysis-facts.schema.json`
- `schemas/portfolio-analysis-facts.schema.json`
- `schemas/performance-analysis-facts.schema.json`

AI is not a calculator of record. These facts are its authoritative numeric context.
