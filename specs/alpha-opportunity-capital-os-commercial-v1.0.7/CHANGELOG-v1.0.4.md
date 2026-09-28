# Changelog — Commercial v1.0.4

**Release theme:** Calculation & Facts Closure before first Codex handoff.

No new strategy family, exchange or live-eligibility claim is added.

## Corrected

- Risk score now normalizes only over applicable dimension weights; N/A dimensions no longer bias score downward.
- Capital allocation is size-aware and uses marginal economics rather than assuming small-size expected return applies to larger allocations.
- Cost and reserve semantics are separated.
- Stablecoin/USD valuation no longer assumes a fixed peg.

## Added

- CanonicalCalculationFacts and CalculationTrace contracts/schemas.
- OpportunityAnalysisFacts as the user/AI factual interface.
- Instrument/exposure normalization for linear/inverse/spot instruments.
- Margin/liquidation/stress-buffer calculations.
- Economics-by-size contract.
- Return normalization / repeatability rules.
- Portfolio mixed-horizon expected P&L and capital-day comparison metrics.
- Canonical valuation policy.
- Formal Alpha Proof TWR contract.
- Venue / settlement-asset review registries and correlation-group registry.
- v1.0.4 calculation configuration.
- migration 004.
- expanded normative Golden Fixtures: six strategy fixture classes per launch strategy plus shared calculation fixtures.
- v1.0.4 calculation acceptance gate.

## Preserved

- v1.0.3 One Product / Multiple Alpha Modules / One Portfolio Brain architecture.
- Structured/Options remain contract-ready and live-disabled.
- current five launch strategy thresholds unless explicitly restated.
- Alpha Proof and stop/go philosophy.
