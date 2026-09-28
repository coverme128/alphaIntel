# Return Normalization Contract v1.0.4

## Canonical return fields

Every Opportunity MUST preserve:

- `holdingPeriodExpectedNetPct`
- `expectedHoldingSeconds`
- `grossHoldingPeriodPct`
- `totalExpectedCostPct`
- `totalReservePct`
- `simpleAnnualizedEquivalentPct` when calculable
- quoted APR/APY only when the source product actually quotes it
- `repeatability`

`holdingDays = expectedHoldingSeconds / 86400`

`simpleAnnualizedEquivalentPct = holdingPeriodExpectedNetPct * 365 / holdingDays`

This is a simple annualized equivalent, not a forecast of repeated compounding.

## Repeatability enum

- `CONTRACTUAL_RECURRING` — economic terms define recurring accrual while held, subject to explicit rate variability.
- `CONDITION_DEPENDENT` — the trade can only be repeated if a new qualifying market condition exists.
- `ONE_SHOT` — a maturity/event/spread realization is not assumed repeatable.

Funding, basis and cross-exchange opportunities default to `CONDITION_DEPENDENT`; a specific yield product may be `CONTRACTUAL_RECURRING` while its quoted rate remains variable.

## UI / AI rule

Default opportunity headline is holding-period expected net return + expected holding time. Annualized equivalent is secondary and must carry `comparisonOnly=true`.

Never convert a short-lived spread into a user claim such as “expected yearly return” without the explicit comparison-only label.
