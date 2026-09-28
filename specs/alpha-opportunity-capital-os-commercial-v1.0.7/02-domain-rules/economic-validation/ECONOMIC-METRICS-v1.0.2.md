# Economic Metrics v1.0.2

## Primary metrics

1. `realizedNetPnlUsd` — reconciled realized P&L after all modeled/observed costs.
2. `portfolioTwrPct` — cash-flow-adjusted portfolio return.
3. `benchmarkTwrPct` — shadow benchmark return over identical dates/flows.
4. `excessReturnPct` — portfolio TWR minus benchmark TWR.
5. `annualizedExcessReturnPct` — annualized only when observationDays >= 30; prominently tagged as unstable until >= 90 live days.
6. `economicValueUsd` — actual ending NAV minus shadow benchmark ending NAV minus attributable run cost.
7. `maxDrawdownPct` — peak-to-trough decline of actual NAV.
8. `captureRatio` — realized positive expected P&L / expected positive P&L for comparable closed executions.
9. `costDragPctOfGross` — total trading/borrow/rebalance/execution costs divided by positive gross strategy P&L.
10. `capitalUtilizationPct` — time-weighted deployed eligible capital / total eligible capital.

## Concentration metrics

- largest execution share of total positive P&L;
- top-5 execution share;
- largest strategy-family share;
- largest venue share;
- largest asset/correlation-group share.

## Reliability metrics

- terminal reconciliation rate;
- execution-failure loss;
- unhedged exposure seconds and dollar-seconds;
- stale-data blocked count;
- model error by cost component;
- opportunity decay from detection to executable decision.

## Metrics that must not be used alone

- headline APR/APY;
- win rate;
- number of opportunities;
- gross P&L;
- expected return;
- Sharpe/Sortino without showing drawdown and benchmark-adjusted value.
