# Strategy Registry Contract

Every strategy version is immutable after promotion.

Required fields:

- `strategy_id`
- `version`
- `family`
- `status`: DRAFT / PAPER_APPROVED / ASSISTED_APPROVED / AUTO_APPROVED / RETIRED
- eligible venues/instruments
- required data inputs
- freshness limits
- entry thresholds
- exit thresholds
- cost model ID
- capacity model ID
- risk policy ID
- execution policy ID
- replay window and acceptance metrics
- approval record

## Promotion

`DRAFT → PAPER_APPROVED → ASSISTED_APPROVED → AUTO_APPROVED`

Promotion is strategy-version-specific. A new formula version restarts promotion.

## No AI mutation

An LLM may propose a DRAFT parameter change, but cannot promote it or change a live registry version.
