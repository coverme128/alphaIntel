# Calculation & Facts Architecture v1.0.4

## Runtime pipeline

1. Venue adapter emits raw typed facts.
2. Instrument normalizer emits canonical instrument/exposure facts.
3. Market normalizer emits freshness-tagged canonical market facts.
4. Formula service evaluates versioned formula contracts.
5. Fact service stores CanonicalCalculationFacts and CalculationTrace.
6. Strategy evaluator builds Opportunity referencing facts/traces.
7. OpportunityAnalysisFacts projects only user/AI-safe facts.
8. Portfolio engine consumes canonical opportunity facts and economics-by-size.
9. Execution/P&L reconciliation writes realized facts using canonical valuation.
10. Alpha Proof consumes reconciled P&L/NAV/TWR facts.

## Implementation rule

Do not duplicate formulas in UI, AI prompts, replay and live code. Shared deterministic libraries must be invoked from all paths.

## Storage

Raw high-frequency data retention may be implementation-specific. Decision snapshots and calculation facts used by Opportunities/Action Plans must be retained for replay/reconciliation according to production retention policy.
