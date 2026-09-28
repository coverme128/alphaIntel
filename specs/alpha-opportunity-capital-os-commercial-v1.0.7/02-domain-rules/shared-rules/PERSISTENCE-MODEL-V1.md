# Persistence Model v1.0.4

Persistence is a deterministic evidence factor used by the allocator; it is not an AI confidence score.

## FUNDING_NEUTRAL

`persistenceFactor = favorableFundingObservations / N`, where N is latest 12 settled observations, minimum 8, and favorable means funding produces positive short-perp cashflow for the supported V1 structure.

## CROSS_EXCHANGE_FUNDING

Convert each leg's history to side-aware position cashflow first. For each venue compute the fraction of latest N observations (target 12, minimum 8) that preserve the selected side's intended sign. The pair factor is:

`persistenceFactor = min(venueA favorable ratio, venueB favorable ratio)`

## BASIS_CASH_CARRY

After settlement/index mapping is verified and both entry legs are executable, `persistenceFactor = 1.0` because launch V1 intends hold-to-expiry convergence. This does not remove market, margin, venue or execution risk.

## CROSS_EXCHANGE_SPREAD

Use replay-calibrated `edgePersistenceRatio` for the exact venue-pair / liquidity bucket:

`edgePersistenceRatio = qualifying snapshots remaining above minExpectedNet after executionLatencyBudget / qualifying snapshots observed`

Calibration window: latest 30 replay days, minimum 100 qualifying snapshots. If evidence is insufficient, factor = 0.70 for PAPER/ASSISTED comparison and AUTO promotion is blocked by evidence gate.

## IDLE_CAPITAL_YIELD

Use up to latest 30 observed product-rate snapshots, minimum 8:

`persistenceFactor = observations where annualized incremental rate remains >= qualification floor / N`

If fewer than 8 observations exist, factor = 0.70 and the fact is marked FALLBACK.

All persistence facts retain sample size, window and config version.
