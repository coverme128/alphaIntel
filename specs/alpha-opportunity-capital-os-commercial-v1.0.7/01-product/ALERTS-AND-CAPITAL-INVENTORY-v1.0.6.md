# Alerts & Capital Inventory — v1.0.6

## Principle

The owner should not need to keep the product open to receive a time-sensitive action, but an alert must never become an execution bypass.

## Required user alerts

### OPPORTUNITY_READY
Sent only when a candidate is currently qualified, fresh, owner-eligible and materially actionable at the recommended size.

Must include:
- action summary;
- capital amount;
- expected holding-period net return;
- risk/maturity;
- validity/expiry;
- deep link to Action Plan.

### EXIT_RECOMMENDED
Sent when a canonical exit/invalidation condition is active.

Must include:
- affected position;
- reason code translated to plain language;
- current realized/unrealized facts;
- estimated exit cost;
- deep link to close/review.

### RISK_ACTION_REQUIRED
Sent only for material owner-action risk: margin deterioration, venue/settlement-asset block, concentration breach or other canonical hard-risk escalation.

### EXECUTION_FAILURE
Sent for leg failure, unresolved partial fill, reconciliation failure or execution state requiring owner attention.

## Anti-noise rules

- no alert for merely CANDIDATE opportunities;
- deduplicate same opportunity/action version;
- material fact/config/version change may re-alert;
- expired opportunities must not alert;
- HOLD/KEEP_CASH may appear on Today but should not produce repeated push alerts;
- alert delivery failure never changes trading truth.

## Capital Inventory Plan

Purpose: prevent `qualified opportunity but capital is on the wrong venue` without adding transfer automation.

Per venue/account show:

- `readyCapitalUsd`: immediately available capital that can satisfy current eligible action constraints;
- `reservedCapitalUsd`: reserved for current positions/orders/risk buffer;
- `excessCapitalUsd`: above current target/pre-positioning requirement;
- `shortfallUsd`: additional ready capital required for currently selected/top actions;
- `blockedCapitalUsd`: capital not eligible because of product/account/margin/asset restrictions;
- `inventoryStatus`: READY / SHORTFALL / EXCESS / BLOCKED / UNKNOWN.

The plan is advisory only in V1.

It MUST NOT:
- enable withdrawal permissions;
- initiate CEX withdrawals;
- initiate chain transfers;
- assume a transfer completes inside an opportunity window;
- count unavailable/locked capital as ready.

## Today integration

Only show inventory when it changes an action:

```text
ETH Cross-Exchange Funding
建议资金：8,000 USDT
状态：当前不可直接执行
原因：Binance 可用资金缺口 3,200 USDT
[查看资金准备]
```

Do not create a separate primary navigation item for inventory.
