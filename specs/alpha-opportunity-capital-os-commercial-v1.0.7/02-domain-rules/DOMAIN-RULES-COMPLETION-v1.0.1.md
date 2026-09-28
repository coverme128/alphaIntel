# Domain Rules Completion Contract — v1.0.1

## Purpose

This patch closes the remaining domain-rule ambiguity in Commercial V1.0.1. Codex implements these contracts; Codex must not invent alternative formulas, threshold semantics, risk aggregation, P&L attribution or multi-leg fallback behavior.

## Normative precedence inside 02-domain-rules

1. `shared-rules/NUMERIC-UNITS.md`
2. `strategy-contracts/*.md`
3. `shared-rules/*.md`
4. `config/strategy-registry.v1.0.1.yaml`
5. `config/risk-policy.v1.0.1.yaml`
6. `config/allocation-policy.v1.0.1.yaml`
7. machine schemas and Golden Fixtures
8. older overview files in `02-domain-rules/`

If an older overview conflicts with this completion layer, this layer wins.

## Frozen vs versioned

Frozen semantics:
- formula definitions;
- cost inclusion/exclusion;
- lifecycle and hard-block semantics;
- risk-score aggregation;
- P&L attribution categories;
- multi-leg recovery rules;
- promotion gates.

Versioned mutable parameters:
- numeric strategy thresholds;
- venue/stablecoin configured risk tiers;
- conservative fee fallbacks;
- portfolio concentration limits.

A numeric change creates a new immutable `strategy_version` or `policy_version`; it never mutates a promoted version in place.

## No profitability claim

Thresholds are production baselines for evaluation, not claims of achievable or guaranteed returns. A strategy remains `DRAFT` until replay/paper evidence satisfies promotion gates.
