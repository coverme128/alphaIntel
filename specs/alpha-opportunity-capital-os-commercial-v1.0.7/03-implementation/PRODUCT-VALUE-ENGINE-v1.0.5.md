# Product Value Engine v1.0.5

## Role

Consumes reconciled Alpha Proof facts, synchronized benchmark risk facts, operator workload measurements and run-cost facts. Produces `ProductValueReport`.

It does not participate in trade entry/exit and cannot override risk/execution controls.

## Inputs

- PerformanceAnalysisFacts / AlphaProofReport
- system daily NAV series
- benchmark daily NAV series
- product run-cost ledger
- manual workload ledger
- incident / hard-risk-breach ledger
- `product-value-policy.v1.0.5.yaml`

## Processing

1. verify minimum evidence coverage;
2. reuse canonical TWR/economic value from Alpha Proof;
3. calculate synchronized max drawdowns;
4. calculate drawdown improvement;
5. calculate workload/time reduction;
6. classify product value;
7. import existing `EXPANSION_WORTHY` state rather than reimplementing it;
8. derive survival decision;
9. emit deterministic reason codes and report hash;
10. project ProductValueAnalysisFacts to UI/AI.

## Non-goals

- no new strategy scoring;
- no trading decisions;
- no LLM classification;
- no automatic monetary price on risk reduction;
- no changing Alpha Proof thresholds.

## AI boundary

AI receives only the generated facts and reason codes. It may explain: "why the product is currently Risk Capital OS value rather than Alpha success". It may not promote or demote the product.
