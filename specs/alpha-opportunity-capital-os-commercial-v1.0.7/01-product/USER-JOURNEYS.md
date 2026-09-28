# User Journeys

## Journey 1 — First safe connection

1. Owner selects venue.
2. Product shows exact required API permissions.
3. Owner connects READ-ONLY credentials first.
4. System validates account identity, products, balances, fee tier and connectivity.
5. System rejects credentials with withdrawal capability when detectable.
6. Opportunity Radar becomes active.
7. Live trading remains disabled until a separate trade credential verification step is completed.

## Journey 2 — Evaluate an opportunity

1. Radar shows a qualified opportunity.
2. User opens detail.
3. Product displays source of return and strategy version.
4. Product displays gross return, modeled costs, expected net return and known/variable return split.
5. Product displays capacity at defined slippage tolerance.
6. Product displays invalidation/exit conditions.
7. Product shows freshness timestamp for every required market input.
8. User chooses Paper or Create Action Plan.

## Journey 3 — Assisted execution

1. System revalidates opportunity immediately before execution.
2. System creates exact order plan.
3. User confirms notional, venues and limits.
4. Execution state machine sends the first/paired legs using strategy-specific atomicity policy.
5. System detects fills/partial fills via private streams.
6. If hedge ratio leaves tolerance, execution enters `HEDGE_REQUIRED` or abort/recovery path.
7. Successful legs become an Active Strategy Position.
8. Monitoring begins automatically.

## Journey 4 — Auto execution

AUTO is unavailable until the owner has:

- completed at least one assisted execution for that strategy family;
- created explicit numeric policy;
- passed credential and kill-switch checks.

AUTO executes only when all eligibility, freshness, cost, capacity, portfolio and account constraints pass at the final pre-trade checkpoint.

## Journey 5 — Exit

Exit can be triggered by:

- target reached;
- funding/basis deterioration;
- risk threshold;
- stale data;
- venue health deterioration;
- portfolio concentration;
- manual owner action;
- global kill switch.

Exit is itself a state machine; “close position” is never assumed to be a single successful request.

## Journey 6 — Reconciliation

After exit:

1. import venue fills and cash/funding ledger events;
2. attribute fees, funding, price P&L, slippage and borrowing/yield income;
3. compare expected versus realized;
4. store model error;
5. mark execution `RECONCILED` only when accounting balances.


## Journey 7 — Daily capital decision (v1.0.3)

1. Owner opens Today.
2. System shows current allocation and a target allocation generated from eligible modules.
3. At most three primary actions are shown; `KEEP_CASH` may be one of them.
4. Owner inspects a Capital Action Plan rather than manually comparing each module.
5. In ASSISTED mode, one confirmation authorizes the deterministic plan orders; in GUIDED, the owner executes externally.
6. The plan expires if required market/account evidence becomes stale.

## Journey 8 — Module opt-in

1. Owner chooses simple risk/product preferences.
2. System compiles them into structured policy.
3. Only modules that are both owner-enabled and registry-eligible may contribute to allocation.
4. Structured/Options remain research-only in v1.0.3 regardless of owner toggle.

## Journey 9 — Receive and act without monitoring the app (v1.0.6)

1. System emits a canonical owner alert only for a current actionable opportunity, exit, material risk or execution failure.
2. Owner opens the deep-linked Action Card.
3. Default view shows action, capital, net expected outcome, monetary risk and maturity.
4. Owner may inspect Why / Calculation Details / Trace progressively.
5. For ASSISTED actions, owner reviews and confirms once; the system revalidates before orders.
6. System monitors position/exit and later reconciles realized value.

## Journey 10 — Capital not on the required venue (v1.0.6)

1. Qualified opportunity exists but current ready capital is insufficient on a required venue/account.
2. Opportunity truth remains unchanged, while execution availability becomes unavailable for the recommended size.
3. Today shows the shortfall and a read-only Capital Inventory Plan.
4. Owner may manually prepare capital outside the system.
5. V1 never requests withdrawal permission or initiates transfers.
