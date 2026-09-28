# BASIS_CASH_CARRY v1.0.4

Status: `DRAFT`.

## Structure

Buy spot + short dated future on same canonical underlying. Reverse cash-and-carry is excluded. Default intent is hold future to expiry/settlement and convert residual spot under the action plan.

## Price formulas

`grossBasisPct = (futureBidTop / spotAskTop - 1) * 100`

`executableBasisPct = (futureBidVWAP / spotAskVWAP - 1) * 100`

`entrySlippagePct = max(0, grossBasisPct - executableBasisPct)`

Expected costs include entry fees/slippage, expected settlement/exit fees, expected spot exit slippage, and applicable capital/borrow cost. Do not double-count top-to-VWAP slippage.

`expectedNetPct = grossBasisPct - totalExpectedCostPct - totalReservePct`

`simpleAnnualizedNetPct = expectedNetPct * 365 / daysToExpiry`

Any model uncertainty reserve is separate from expected exit cost.

## Qualification

- gross basis >0;
- expectedNetPct >=0.50%;
- simpleAnnualizedNetPct >=8.0%;
- 7 <= daysToExpiry <=180;
- entry slippage <=10 bps;
- maxNotionalUsd >=5,000;
- settlement/index mapping verified;
- instrument active;
- canonical rounded delta match passes;
- derivative margin evidence passes;
- no hard risk block.

## Return normalization

Repeatability = `CONDITION_DEPENDENT`; the absolute holding-period return is primary. Annualized basis is comparison-only.

## Exit

Primary exit is settlement. Early exit only if:

- executable close realizes >=80% of original expected net P&L AND remaining simple annualized return <6%; or
- risk requires reduction.

No favorable convergence is counted twice.
