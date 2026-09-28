# Strategy Promotion Gates v1.0.1

Promotion is evidence-based and strategy-version-specific. Meeting a sample minimum does not prove future profitability.

## DRAFT → PAPER_APPROVED

Required:
- all formula Golden Fixtures pass 100%;
- replay is deterministic: same input hash + strategy hash => same outputs;
- no hard-block bypass in tests;
- at least 30 calendar days replay for high-frequency spread and 90 days for funding/yield; basis requires enough expiries to include at least 20 distinct contract observations or 180 days where data exists;
- aggregate modeled net P&L after all modeled costs is positive;
- no single opportunity contributes >25% of aggregate modeled profit;
- modeled max drawdown is within owner risk policy;
- expected-vs-paper realized model error is reported, not hidden.

## PAPER_APPROVED → ASSISTED_APPROVED

Required:
- minimum 14 live calendar days;
- at least 30 closed assisted executions for trade strategies, or 10 complete subscribe/redeem cycles for yield;
- 100% terminal-order reconciliation;
- zero duplicate economic orders;
- zero unresolved one-leg exposure beyond emergency policy timeout;
- aggregate realized net P&L positive;
- median `realizedNetPnl / expectedNetPnl` >= 0.65 for positive-expected trades;
- no severity-1 execution/security incident.

## ASSISTED_APPROVED → AUTO_APPROVED

Required:
- at least 30 additional calendar days under assisted/shadow-auto operation;
- at least 50 additional closed executions;
- kill-switch, restart recovery and unknown-order-state chaos tests pass;
- 100% reconciliation;
- aggregate realized net P&L remains positive;
- portfolio drawdown remains within policy;
- no unresolved critical execution incident;
- explicit owner approval record.

## Automatic demotion

AUTO entry is disabled when:
- 7-day realized net P&L falls below configured loss gate;
- execution failure/hedge mismatch exceeds policy;
- connector/API contract changes invalidate adapter tests;
- venue/stablecoin risk tier becomes unknown/blocked;
- strategy formula/config version changes.
