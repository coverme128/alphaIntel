# Economic Validation Stages v1.0.2

## Stage E0 — UNPROVEN

Default for every delivered strategy and the aggregate portfolio.

## Stage E1 — REPLAY_POSITIVE

Minimum evidence:
- production evaluators, not a separate backtest strategy implementation;
- >= 180 calendar days where sufficiently complete data exist; 365 days preferred;
- >= 6 distinct calendar months;
- synchronized data for cross-venue strategies; otherwise that strategy is `EVIDENCE_INSUFFICIENT`;
- base case net P&L > 0;
- benchmark-adjusted return > 0;
- fee +25% stress individually non-negative;
- slippage +50% stress individually non-negative;
- combined fee +25% + slippage +50% reported; negative combined stress blocks `REPLAY_STRONG` but does not falsify base evidence;
- no single execution >25% of positive modeled P&L;
- cost and missing-data coverage reported.

Replay is hypothesis evidence only. It cannot produce `ALPHA_VALIDATED`.

## Stage E2 — PAPER_POSITIVE

Minimum:
- >= 30 live calendar days;
- live feeds and production decision path;
- simulated fills use executable book/depth and configured latency;
- positive net paper P&L;
- positive benchmark-adjusted TWR;
- no unreconciled accounting drift;
- expected-to-paper capture ratio >= 0.60.

## Stage E3 — LIVE_POSITIVE

Minimum:
- >= 60 live calendar days after first real-money execution;
- >= 30 closed trade executions/cycles in aggregate; low-frequency basis can contribute fewer provided aggregate evidence exists;
- realized net P&L > 0;
- excess return > 0;
- 100% terminal economic reconciliation;
- no severity-1 execution/security incident;
- drawdown within owner policy;
- execution-failure loss <= configured gate.

## Stage E4 — ALPHA_VALIDATED

Minimum:
- >= 90 live calendar days;
- >= 50 closed real-money executions/cycles in aggregate OR a documented low-frequency exception with >= 3 independent expiry/settlement cycles and >= 120 days;
- realized net P&L > 0;
- annualized excess return >= `alphaValidation.minAnnualizedExcessReturnPct` (default 3 percentage points);
- capture ratio >= 0.65;
- cost drag <= configured maximum;
- largest execution <= 25% of positive P&L;
- top five executions <= 50% of positive P&L;
- max drawdown <= owner risk policy;
- no unresolved severity-1 incident.

This state is evidence of historical live alpha, not a forecast or guarantee.

## Revalidation

Rolling evidence is recomputed daily. A validated strategy/portfolio moves to `INVALIDATED` when mandatory live gates fail for the configured review window or when formula/connector semantics change.
