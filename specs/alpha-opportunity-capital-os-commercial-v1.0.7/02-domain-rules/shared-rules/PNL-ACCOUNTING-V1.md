# P&L Accounting Contract v1.0.4

## Canonical components

Every closed strategy position attributes USD-equivalent realized P&L into:

- `pricePnlUsd`
- `fundingPnlUsd`
- `yieldPnlUsd`
- `feePnlUsd` (negative)
- `borrowPnlUsd` (negative)
- `transferRebalancePnlUsd` (negative)
- `otherPnlUsd` typed exceptional cashflows only.

`realizedNetPnlUsd = sum(all components)`

`realizedNetPct = realizedNetPnlUsd / allocatedCapitalUsd * 100`

## Valuation

Raw cashflows remain in their original asset. USD-equivalent conversion uses `VALUATION-POLICY-V1.md` at each cashflow's event time. Stablecoin amounts are not assumed equal to USD.

Persist conversion price/source/time on every non-USD cashflow valuation.

## Expected vs realized

At plan creation persist:

- expected net % / P&L USD at the exact planned size;
- expected cost component breakdown;
- reserve component breakdown separately;
- formula/config/input hashes.

At reconciliation:

`pnlErrorUsd = realizedNetPnlUsd - expectedNetPnlUsd`

`pnlErrorPctOfExpected = pnlErrorUsd / max(abs(expectedNetPnlUsd),0.01) * 100`

Reserves are not booked as realized losses unless the corresponding loss/cost actually occurs.

## Reconciliation gate

`CLOSED → RECONCILED` only when:

- every execution leg is terminal;
- fees are ingested;
- all funding/yield events are ingested or explicitly unavailable;
- residual inventory is accounted for;
- all conversion prices required for USD P&L are available;
- component sum equals the cashflow ledger within USD 0.01 or documented venue rounding tolerance.

Unreconciled positions are excluded from promoted strategy performance statistics and Alpha Proof.
