# Per-Strategy Execution Policies v1.0.1

## Global safeguards

- stable `execution_id` and per-leg `client_order_id`;
- final pre-trade revalidation;
- no withdrawal permission required or accepted for live API keys;
- max retry of an unknown-state order is **0** until venue order state is reconciled;
- retries use the same economic intent/idempotency mapping;
- any unresolved leg after timeout moves execution to `MANUAL_INTERVENTION` or deterministic hedge fallback.

## FUNDING_NEUTRAL / BASIS_CASH_CARRY

Default entry: spot leg first only when spot inventory purchase is immediately hedgeable; otherwise use batched/simultaneous submission when supported.

- max unhedged notional: min(`$1,000`, `5%` of intended strategy notional);
- max unhedged duration: 3 seconds;
- partial-fill tolerance before corrective hedge: 2% of intended base quantity;
- if spot fills and derivative fails: hedge with derivative IOC at configured emergency slippage ceiling;
- if derivative fills and spot fails: buy spot IOC or flatten derivative, choosing the lower deterministic modeled loss;
- emergency slippage ceiling: 25 bps; beyond it set `MANUAL_INTERVENTION` and activate strategy entry kill switch.

## CROSS_EXCHANGE_FUNDING

Prefer simultaneous IOC/marketable-limit orders.

- max unhedged notional: min(`$1,000`, `5%`);
- max unhedged duration: 3 seconds;
- partial-fill mismatch >2% triggers immediate hedge/flatten;
- no venue transfer is initiated as part of execution recovery.

## CROSS_EXCHANGE_SPREAD

- simultaneous IOC/batched submission required when adapters support it;
- max unhedged notional: min(`$500`, `5%`);
- max unhedged duration: 2 seconds;
- mismatch >1% triggers immediate hedge on the venue with best executable depth;
- emergency hedge budget: 20 bps from planned net edge;
- if recovery exceeds budget, block new spread entries on that venue pair pending review.

## IDLE_CAPITAL_YIELD

- subscription/redemption operations are single-leg financial-product actions, not trade-order legs;
- AUTO disabled by default;
- redemption instruction must preserve cash-reserve policy;
- product term change invalidates the plan and requires regeneration.
