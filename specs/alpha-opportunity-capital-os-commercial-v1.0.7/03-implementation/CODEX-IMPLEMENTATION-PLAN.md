# Codex Implementation Plan

## Batch 00 — Contract freeze

- ingest MASTER + domain schemas;
- create ADR documenting no-LLM-in-trading-path;
- create repository module boundaries;
- add schema validation in CI.

**Exit:** contract tests compile; no live venue code yet.

## Batch 01 — Market connectivity

- implement canonical types;
- OKX/Binance/Bybit/Hyperliquid public adapters;
- snapshot + WebSocket recovery;
- health/freshness dashboard.

**Exit:** all four venues produce normalized books/funding/tickers.

## Batch 02 — Opportunity economics

- fee model;
- slippage/book-walk;
- capacity;
- five launch evaluators;
- registry/versioning;
- candidate/qualified persistence.

**Exit:** deterministic golden tests pass.

## Batch 03 — Replay and Paper

- replay input format;
- paper fills and cashflows;
- expected vs simulated-realized attribution;
- 30-day replay report.

**Exit:** reproducible replay and no accounting mismatch.

## Batch 04 — Portfolio/Risk + Capital Rotation Core

- risk policy;
- exposure aggregation;
- constrained allocator;
- module registry;
- Capital Rotation policy and churn guards;
- PortfolioRecommendation and CapitalActionPlan;
- kill switches.

**Exit:** the system produces deterministic current→target allocation recommendations; hard limits cannot be bypassed through API/UI.

## Batch 05 — Private connectivity & Assisted

- credential vault integration;
- balances/positions/private streams;
- order adapter;
- execution state machine;
- assisted confirmation flow.

**Exit:** partial/rejection/recovery scenarios pass.

## Batch 06 — Auto

- explicit auto policy;
- eligibility gates;
- rate/risk caps;
- automatic exit monitoring.

**Exit:** auto orders are provably bounded by saved policy.

## Batch 07 — Unified Product UX + AI hardening

- Today / Opportunities / Positions / Portfolio / Performance primary view models, with Execution as contextual detail;
- module readiness surfaces;
- explain/filter endpoints;
- deterministic fallback templates;
- user-readable evidence/assumptions;
- no AI dependency in execution.

## Batch 08 — Production handoff

- monitoring/alerts;
- backups;
- deployment scripts;
- launch gate report.

### Codex instruction

Do not implement Structured Products/Options pricing or live execution beyond the v1.0.3 built-in module contracts. Do not implement SaaS billing, broker programs or generic microservices unless explicitly provided in a later pack.


## Batch 00A — Domain Rule Freeze (v1.0.1, mandatory before engine implementation)

1. Load and validate all files under `02-domain-rules/config/`.
2. Implement numeric-unit types/converters.
3. Implement shared cost, capacity, risk, allocator and P&L contracts.
4. Implement the five strategy evaluators exactly from `strategy-contracts/`.
5. Make legacy fixtures for regression plus normative `golden-fixtures.v1.0.4.json` pass before continuing.
6. Persist strategy/config hashes on every opportunity and action plan.
7. Keep all delivered strategy statuses `DRAFT`; do not self-promote.


## Batch 03A — Economic Instrumentation / Alpha Proof (v1.0.2, mandatory before economic claims)

1. Apply `migrations/002-economic-validation.sql`.
2. Implement daily NAV/external-flow ledger and shadow benchmark NAV.
3. Implement run-cost ledger and cost attribution.
4. Implement Alpha Proof Engine exactly from `02-domain-rules/economic-validation/`.
5. Make `economic_golden_fixtures.v1.0.2` equivalent tests pass (source fixture filename uses hyphens: `economic-golden-fixtures.v1.0.2.json`).
6. Add chronological replay calibration/holdout handling.
7. Generate deterministic `AlphaProofReport` with report hash.
8. Keep all economic states `UNPROVEN` until evidence gates promote them.

**Exit:** software can state whether evidence is absent, positive, validated, insufficient, or invalidated without using expected opportunity count as a profitability proxy.


## Batch 00B — Product Architecture Freeze (v1.0.3, mandatory before UI/domain implementation)

1. Load `module-registry.v1.0.3.yaml` as the handoff seed state; do not pre-assert implementation readiness.
2. Add schemas for module state, portfolio recommendation and Capital Action Plan.
3. Implement Carry/Yield module boundaries and promote each from CONTRACT_READY to IMPLEMENTED only after applicable formula/adapter/Golden gates pass.
4. Register Structured/Options as contract-ready but disabled; do not implement their strategies.
5. Implement Capital Rotation in Batch 04 from `CAPITAL-ROTATION-v1.0.3.md`.
6. Make Today/For You recommendation-first; module browsing is secondary.

**Exit:** product architecture conforms to `One Product, Multiple Alpha Modules, One Portfolio Brain` without enabling any unvalidated strategy.


## Batch 00C — Calculation & Facts Closure (v1.0.4, mandatory before Batch 01)

1. Load v1.0.4 formula, calculation, risk, valuation and registry artifacts.
2. Implement Instrument Normalization and canonical exposure math.
3. Implement Cost vs Reserve separation and Return Normalization.
4. Implement Margin/Liquidation metrics and hard blocks.
5. Implement size-aware `economicsBySize` and marginal allocation economics.
6. Implement CanonicalCalculationFacts / CalculationTrace persistence via migration 004.
7. Implement Portfolio Expected Return and Canonical Valuation policies.
8. Implement formal TWR flow-boundary logic for Alpha Proof.
9. Project `OpportunityAnalysisFacts` for user/AI consumption.
10. Make all `golden-fixtures.v1.0.4.json` strategy/shared-rule fixtures pass.

**Exit:** the same deterministic fact can be reproduced in live/replay/paper, shown to the user and explained by AI without a second calculation implementation.

## Batch 00D — Product Value & Survival Gate (v1.0.5, mandatory instrumentation before live value claims)

1. Load `product-value-policy.v1.0.5.yaml` and `alpha-thesis-priority.v1.0.5.yaml`.
2. Apply `migrations/005-product-value.sql`.
3. Implement Product Value Engine without duplicating Alpha Proof/TWR calculations.
4. Implement synchronized drawdown-comparison facts.
5. Implement operator workload facts with source-quality labels.
6. Emit `ProductValueReport` and `ProductValueAnalysisFacts`.
7. Add Performance Product Value view model.
8. Enforce separate `valueClassification`, `expansionDecision`, and `survivalDecision`.
9. Keep Cross-Exchange Spread opportunistic; do not create dedicated HFT infrastructure.
10. Make v1.0.5 acceptance fixtures/tests pass.

**Exit:** the product can deterministically say whether it has Alpha value, risk-management value, automation-only value, insufficient evidence, or no material value; and can issue a formal keep/reduce/stop decision without AI inference.


## Batch 00E — Personal UX Contract Freeze (v1.0.6, mandatory before UI implementation)

1. Load v1.0.6 owner-action, alert and capital-inventory schemas.
2. Freeze primary navigation to Today / Opportunities / Positions / Portfolio / Performance.
3. Treat all other operational surfaces as Advanced/Settings or contextual drill-down.
4. Implement deterministic OwnerActionCard projection from existing canonical facts; do not recompute economics/risk in UI code.
5. Implement `Why` from reason codes, Calculation Details from canonical facts and Trace from CalculationTrace.
6. Implement alert-event generation/dedupe/expiry without changing execution eligibility.
7. Implement advisory Capital Inventory Plan from balances/reservations/constraints; do not implement transfer automation.
8. Add UX tests that Today never presents more than three primary actions and that HOLD/KEEP_CASH are valid recommendations.

**Exit:** owner can understand and act on the system's recommendation without browsing modules or internal calculation/governance surfaces, while all professional detail remains available by progressive disclosure.
