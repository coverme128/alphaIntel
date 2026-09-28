# Time-Weighted Return Contract v1.0.4

Alpha Proof requires external-flow-neutral portfolio and benchmark returns.

## External flow

External flows are owner deposits/withdrawals entering or leaving the measured portfolio. Trades, internal venue transfers, funding, fees, yield and strategy rebalancing are NOT external flows.

## Flow-boundary subperiod method

Whenever an external flow occurs:

1. value portfolio immediately before the external flow under canonical valuation policy;
2. close the current subperiod;
3. apply the flow;
4. start the next subperiod from the post-flow NAV.

For a subperiod with no external flow inside:

`r_j = (endNavUsd / startNavUsd) - 1`

Overall:

`TWR = (product(1 + r_j) - 1) * 100`

The shadow benchmark uses the same external flow amount/timestamp.

## Valuation timing tolerance

A flow-boundary valuation must be available within 5 minutes of the external flow. If not, the affected day is `EVIDENCE_INSUFFICIENT` for Alpha Proof rather than approximated optimistically.

## Annualization

Annualized TWR may be displayed only when observation span >=30 calendar days:

`annualizedTwrPct = ((1 + TWR/100) ** (365/observationDays) - 1) * 100`

`excessTwrPct = portfolioTwrPct - benchmarkTwrPct`

Economic Value in USD remains based on actual ending NAV difference minus run cost, not on annualized TWR.
