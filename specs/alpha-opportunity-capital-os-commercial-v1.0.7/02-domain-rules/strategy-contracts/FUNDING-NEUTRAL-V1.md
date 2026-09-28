# FUNDING_NEUTRAL v1.0.4

Status on delivery: `DRAFT`. Promotion requires evidence.

## Economic structure

Launch V1 supports positive-funding cash-and-carry only: buy spot + short matching perpetual, with rounded canonical delta mismatch inside policy.

## Required inputs

Canonical instrument mapping, spot/perp books, current/predicted funding, next funding time and actual interval, >=8 settled funding observations (target 12), actual/conservative fee tier, mark/index price, balances/margin, instrument status, rounding metadata and live margin evidence.

## Conservative funding estimator

For latest N settled rates where N=min(12,available), N>=8:

- `clipped_i = max(history_i,0)`
- `historicalQ25 = percentile(clipped_i,25)`
- `conservativeFundingRate = min(max(currentFundingRate,0), historicalQ25)`
- `positivePersistence = count(history_i>0)/N`

Reject if conservative rate <=0 or persistence <0.67.

Build the planned settlement schedule from `nextFundingTime` + venue interval. Never hard-code 8h.

`grossHoldingPeriodPct = expectedFundingPct = sum(conservativeFundingRate for planned receiving settlements) * 100`

## Cost / reserve

Expected costs include entry/expected-exit fees and size-specific slippage plus any applicable financing cost.

Basis adverse risk is a reserve, not a paid fee:

- `basisAdverseReservePct = P75 adverse spot-perp basis widening over planned horizon`;
- fallback before strategy replay calibration: 0.02%.

`expectedNetPct = grossHoldingPeriodPct - totalExpectedCostPct - totalReservePct`

## Qualification

- expectedNetPct >=0.08%;
- maxNotionalUsd >=5,000;
- total entry slippage <=8 bps;
- positivePersistence >=0.67;
- abs entry basis <=0.75%;
- post-rounding delta mismatch <=0.50%;
- required data/margin evidence fresh;
- no hard risk block.

## Return normalization

Repeatability = `CONDITION_DEPENDENT`. Headline = holding-period expected net + expected holding time. Annualized equivalent is comparison-only.

## Exit

Exit when any:
1. continuation net <=0.02%;
2. funding non-positive for 2 evaluator observations spanning >=5 min;
3. adverse basis widening from entry >0.75%;
4. hold reaches 48h;
5. live risk exit/hard safety condition.

Emergency hedge/flatten is deterministic execution policy, never AI.
