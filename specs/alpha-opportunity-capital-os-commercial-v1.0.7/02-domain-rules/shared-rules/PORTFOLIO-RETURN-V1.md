# Portfolio Expected Return Contract v1.0.4

Portfolio opportunities often have different holding horizons. Do not average their annualized rates.

For each allocation i:

`expectedPnlUsd_i = allocatedNotionalUsd_i * expectedNetPctAtSize_i / 100`

`effectiveLockDays_i = max(expectedHoldingSeconds_i / 86400, strategyCapitalDayFloor_i)`

## Mixed-horizon plan metrics

`expectedPlanPnlUsd = sum(expectedPnlUsd_i)`

`expectedPortfolioEquityImpactPct = expectedPlanPnlUsd / portfolioEquityUsd * 100`

This is the expected P&L impact of the proposed mixed-horizon plan, not a single-period portfolio return.

## Capital-day normalization

`capitalDays = sum(allocatedNotionalUsd_i * effectiveLockDays_i)`

`capitalDayExpectedReturnPct = expectedPlanPnlUsd / capitalDays * 100`

`simpleAnnualizedComparisonPct = capitalDayExpectedReturnPct * 365`

The annualized comparison is `comparisonOnly=true`; it is not a promise that opportunities repeat.

## Required user output

Today/Portfolio MUST show:

- expected plan P&L USD;
- portfolio-equity impact %;
- weighted expected holding / capital days;
- optional simple annualized comparison with comparison-only label;
- current/target allocation and cash reserve.

AI must never describe `simpleAnnualizedComparisonPct` as a guaranteed or expected calendar-year return.
