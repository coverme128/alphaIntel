# Product Survival Gates v1.0.5

## Evidence minimums

Before classification other than `EVIDENCE_INSUFFICIENT`:

- at least 90 live calendar days;
- reconciled NAV and benchmark data for >= 95% of required valuation boundaries;
- no unresolved P&L reconciliation blocker;
- product run cost ledger complete.

`STOP_PRODUCT` additionally requires at least 120 live days. A shorter window may stop trading for safety, but must not be used as a final product-value verdict.

## 1. ALPHA_PRODUCT_SUCCESS

Classify when existing Alpha Proof status is `ALPHA_VALIDATED`.

Default Alpha Proof already requires, among other gates:

- positive realized net P&L;
- positive benchmark-adjusted return;
- >= 90 live days;
- default annualized excess return >= 3 percentage points;
- capture ratio and concentration controls.

Survival decision: `CONTINUE`.

Expansion is still governed by the stricter existing `EXPANSION_WORTHY` gate.

## 2. RISK_CAPITAL_OS_VALUE

May classify only when Alpha is not validated and all are true:

- system annualized return gap versus benchmark >= `-1.0` percentage point by default;
- relative max-drawdown reduction >= `30%`;
- no owner hard-risk breach;
- no Severity-1 execution incident;
- synchronized comparable window.

Survival decision: `KEEP_REDUCED_SCOPE`.

Expansion decision: `DO_NOT_EXPAND` unless Alpha separately becomes `EXPANSION_WORTHY`.

## 3. AUTOMATION_VALUE_ONLY

May classify only when Alpha and Risk Capital OS criteria are not met and all are true:

- system annualized return gap versus benchmark is between `-1.0` and `+1.0` percentage points;
- manual time reduction >= `70%`;
- annualized-equivalent manual hours saved >= `50` hours/year;
- operational measurements are `MEASURED` or `OWNER_LOGGED` for at least 60% of the evaluation window.

Survival decision: `KEEP_REDUCED_SCOPE`.

Expansion decision: `DO_NOT_EXPAND`.

## 4. NO_MATERIAL_VALUE

Classify when sufficient evidence exists but none of the above value classes pass.

For `NO_MATERIAL_VALUE` between day 90 and day 119, use `survivalDecision = KEEP_REDUCED_SCOPE` and `expansionDecision = DO_NOT_EXPAND` while evidence matures.

## 5. STOP_PRODUCT

Set only when all are true:

- >= 120 live days;
- value classification is `NO_MATERIAL_VALUE`;
- annualized excess return <= 0 percentage points;
- relative drawdown reduction < `10%` or invalid;
- manual time reduction < `25%` or annualized-equivalent hours saved < `20`;
- no evidence-quality blocker that could plausibly reverse the result.

Survival decision: `STOP_PRODUCT`.

The product may export history and close positions under normal risk policy, but new engineering expansion is stopped.

## Safety override

Safety can suspend trading at any time independently of Product Survival. Product Survival must never override kill switches, risk blocks or venue safety blocks.
