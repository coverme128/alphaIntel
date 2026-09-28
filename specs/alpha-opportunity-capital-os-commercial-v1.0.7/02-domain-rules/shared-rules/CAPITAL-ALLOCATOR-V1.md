# Capital Allocator v1.0.4

The V1 allocator is deterministic, greedy, size-aware and constraint-first. It is not mean-variance optimization and not ML.

## Default portfolio limits

- minimum cash reserve: 15% of portfolio equity;
- max single opportunity: 10%;
- max one strategy family: 35%;
- max one venue: 40%;
- max one canonical asset: 40%;
- max one settlement stablecoin: 80%;
- max one correlation group: 40%;
- live default max effective leverage: 1.5x; target for neutral strategies <=1.0x.

## Effective lock days

`effectiveLockDays = max(expectedHoldingSeconds/86400, strategyCapitalDayFloor)`

Capital-day floors:
- FUNDING_NEUTRAL: 0.50
- BASIS_CASH_CARRY: actual days to expiry, minimum 7
- CROSS_EXCHANGE_FUNDING: 0.50
- CROSS_EXCHANGE_SPREAD: 0.25
- IDLE_CAPITAL_YIELD: max(1.0, actual lock/redemption horizon days)

## Multipliers

Risk multipliers:
- LOW 1.00
- MEDIUM_LOW 0.85
- MEDIUM 0.65
- MEDIUM_HIGH 0.40
- HIGH 0.00

`persistenceFactor` is strategy-specific in [0,1]. Funding uses favorable-history ratio; basis = 1 after settlement verification; spread uses replay edge-persistence ratio; yield uses rate-observation persistence. Until a strategy-specific persistence formula has evidence, it is 0.70 rather than invented.

`executionFactor` before live evidence = 0.70. After at least 20 attempted executions:

`executionFactor = min(1, successRate / 0.98)`

## Size-aware marginal score

For an increment from A to B use `marginalExpectedNetPct` from the Capacity model.

`marginalNetBps = marginalExpectedNetPct * 100`

`marginalAllocationScore = (marginalNetBps / effectiveLockDays) * riskMultiplier * persistenceFactor * executionFactor`

A negative/zero marginal net receives score 0.

## Allocation algorithm

1. remove blocked/stale/unqualified opportunities;
2. reserve 15% cash first;
3. initialize all candidate allocations at zero/current held size;
4. for every possible 1%-equity increment, obtain economics at the resulting cumulative size;
5. calculate marginal score and reject increments that breach venue/asset/stablecoin/strategy/correlation/margin caps;
6. choose the highest positive marginal-score increment;
7. repeat until no positive eligible increment remains;
8. unallocated funds remain cash/reserve or eligible Idle Yield.

The allocator never uses a small-size return estimate for a larger allocation and never increases size because AI recommends it.
