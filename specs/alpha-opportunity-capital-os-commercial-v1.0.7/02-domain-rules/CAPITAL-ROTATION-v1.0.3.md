# Capital Rotation Core v1.0.3

Capital Rotation is a V1 core domain capability. It compares current allocations, eligible opportunities, idle capital and cash reserve on a deterministic after-cost basis.

## Inputs

- portfolio equity and free cash;
- current strategy positions and remaining expected economics;
- qualified canonical opportunities;
- module registry states;
- risk policy and exposure state;
- exit costs/penalties of current positions;
- entry costs of target opportunity;
- capacity and liquidity;
- strategy/venue execution readiness.

## Comparable utility

Use the existing Capital Allocator score for candidate ranking. For rotation decisions additionally compute:

`remainingCurrentNetPct` = modeled return remaining from holding current position over its expected remaining horizon.

`rotationCostPct` = current exit cost + target entry cost + explicit transfer/rebalance cost + configured switch reserve.

`incrementalNetPct` = targetExpectedNetPct - remainingCurrentNetPct - rotationCostPct.

`relativeUtilityImprovement` = (targetUtilityPerCapitalDay - currentUtilityPerCapitalDay) / max(abs(currentUtilityPerCapitalDay), epsilon).

A rotation is eligible only when all of the following are true:

1. target opportunity is QUALIFIED and fresh;
2. target module is allocation-eligible for the current mode;
3. current position is legally/operationally exit-eligible;
4. `incrementalNetPct >= minAbsoluteIncrementalNetPct`;
5. `relativeUtilityImprovement >= minRelativeUtilityImprovement` unless current position is already under an exit/risk trigger;
6. resulting portfolio passes all concentration/correlation/cash-reserve constraints;
7. expected benefit remains positive under configured cost reserve;
8. daily turnover guard is not exceeded.

## Frozen v1.0.3 churn guards

Normative values live in `config/capital-rotation-policy.v1.0.3.yaml`.

Default baseline:

- min absolute incremental benefit: 0.05 percentage points;
- min relative utility improvement: 20%;
- switch reserve: 2 bps;
- minimum 25% of target hold elapsed before voluntary rotation, unless exit/risk condition is active;
- max voluntary portfolio turnover per rolling 24h: 25% of equity;
- global risk reduction / emergency exit ignores turnover and hold-time guards.

These are policy defaults, not profit claims.

## Rotation outputs

- `HOLD` current position;
- `ALLOCATE_CASH` to target;
- `REDUCE` current position;
- `ROTATE` from source to target;
- `MOVE_TO_YIELD`;
- `KEEP_CASH`.

## No-AI rule

AI may explain a rotation. It may not create, change, rank, size or override a rotation decision.
