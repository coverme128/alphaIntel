# CHANGELOG — Commercial v1.0.5

## Product Value & Survival Gate

This release adds **no new venue, strategy, pricing model or execution capability**. It closes the product-level question: after real operation, is the system valuable enough to keep, narrow, expand or stop?

### Frozen decisions

- Personal-capital primary success remains **realized benchmark-adjusted Excess Alpha**.
- Product value is a **vector**, not an arbitrary scalar sum: Alpha Value, Risk Reduction Value, Operational Efficiency Value, and Product Run Cost are reported separately.
- A monetized aggregate is allowed only when the owner explicitly configures monetary coefficients for time/risk value; it is never required for Alpha validation.
- Alpha failure does not automatically mean software failure. The product may be retained as `RISK_CAPITAL_OS_VALUE` or `AUTOMATION_VALUE_ONLY`, but these states do **not** authorize Alpha strategy expansion.
- If, after sufficient live evidence, the product has no material Alpha, risk-reduction or operational-efficiency value, the formal decision is `STOP_PRODUCT`.
- `CROSS_EXCHANGE_SPREAD` remains implemented but is reclassified as `OPPORTUNISTIC`, not a core Alpha thesis.
- Core V1 thesis becomes Funding / Cross-Exchange Funding / Basis / Yield / Capital Rotation.
- Structured and Options remain built-in `CONTRACT_READY`, allocation/execution disabled.

### New normative artifacts

- `01-product/PRODUCT-VALUE-AND-SURVIVAL-v1.0.5.md`
- `01-product/PERFORMANCE-VALUE-VIEW-v1.0.5.md`
- `02-domain-rules/product-value/PRODUCT-VALUE-CONTRACT-v1.0.5.md`
- `02-domain-rules/product-value/PRODUCT-SURVIVAL-GATES-v1.0.5.md`
- `02-domain-rules/product-value/PRODUCT-VALUE-METRICS-v1.0.5.md`
- `02-domain-rules/product-value/config/product-value-policy.v1.0.5.yaml`
- `02-domain-rules/product-value/schemas/product-value-report.schema.json`
- `02-domain-rules/product-value/schemas/product-value-analysis-facts.schema.json`
- `02-domain-rules/config/alpha-thesis-priority.v1.0.5.yaml`
- `03-implementation/PRODUCT-VALUE-ENGINE-v1.0.5.md`
- `03-implementation/migrations/005-product-value.sql`
- `04-production-handoff/V1.0.5-PRODUCT-VALUE-ACCEPTANCE.md`
- `04-production-handoff/PRODUCT-SURVIVAL-RUNBOOK-v1.0.5.md`

v1.0.5 supersedes prior product-value interpretations where they conflict. Calculation truth remains governed by v1.0.4.
