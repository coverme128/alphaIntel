# Calculation & Facts Closure — Commercial v1.0.4

This release closes the calculation-to-user/AI truth path without adding strategy families, venues or live eligibility.

## Frozen truth path

`Venue Raw Data → Canonical Instrument/Market Facts → Deterministic Formula → CanonicalCalculationFacts → OpportunityAnalysisFacts → User / AI`

No UI formatter, AI layer, or portfolio layer may silently recompute a metric using different semantics.

## Mandatory rules

1. Every decision-relevant numeric result MUST have a canonical calculation fact or a direct observed fact.
2. Every derived fact MUST identify `formulaId`, `formulaVersion`, input facts/snapshot hash, unit, computed time and quality.
3. Cost and reserve are distinct:
   - costs are expected/known economic cash or execution drag;
   - reserves are conservative model allowances and are not represented as already-paid fees.
4. Return comparisons MUST preserve holding period and repeatability. Annualized equivalents are comparison aids, never guaranteed forecasts.
5. Risk scores normalize over applicable dimensions only. N/A dimensions do not receive a zero score and do not remain in the denominator.
6. Derivative live eligibility requires deterministic margin/liquidation evidence under `MARGIN-LIQUIDATION-V1.md`.
7. Cross-venue and multi-leg sizing uses canonical base exposure / delta, never raw venue quantity equality.
8. Opportunity economics MUST be size-aware through `economicsBySize`; the allocator uses marginal economics as capital is added.
9. Portfolio expected output MUST distinguish mixed-horizon plan P&L from capital-day normalized comparison metrics.
10. Portfolio NAV and P&L use the canonical valuation policy. Stablecoins are not assumed to equal USD.
11. Alpha Proof TWR uses the formal flow-boundary contract. Missing valuation evidence blocks the affected proof interval.
12. AI may explain only from `OpportunityAnalysisFacts` / portfolio fact objects. Raw prose may not override canonical facts.

## Required v1.0.4 artifacts

- `RETURN-NORMALIZATION-V1.md`
- `INSTRUMENT-NORMALIZATION-V1.md`
- `MARGIN-LIQUIDATION-V1.md`
- `VALUATION-POLICY-V1.md`
- `PORTFOLIO-RETURN-V1.md`
- `CALCULATION-TRACE-V1.md`
- revised Cost / Capacity / Risk / Allocator / P&L contracts
- calculation/risk/valuation registries
- calculation/facts schemas
- expanded Golden Fixtures
- TWR contract

## Compatibility

v1.0.4 supersedes calculation semantics in v1.0.1–v1.0.3 where they conflict. Strategy thresholds remain unchanged unless explicitly stated. The main semantic corrections are applicable-risk normalization, size-aware marginal allocation, cost/reserve separation, and canonical valuation.
