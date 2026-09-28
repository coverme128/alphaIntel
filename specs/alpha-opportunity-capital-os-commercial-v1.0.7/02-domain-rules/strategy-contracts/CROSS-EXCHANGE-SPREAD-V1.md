# CROSS_EXCHANGE_SPREAD v1.0.4

Status: `DRAFT`; strict promotion due edge decay/execution risk.

## Structure

On two pre-funded venues, buy low ask and sell same canonical base exposure on high bid. Transfer-after-detection is never executable arbitrage.

## Formula

`grossSpreadPct = (sellBidTop - buyAskTop) / buyAskTop * 100`

`executableSpreadPct = (sellBidVWAP - buyAskVWAP) / buyAskVWAP * 100`

`entrySlippagePct = max(0, grossSpreadPct - executableSpreadPct)`

Expected costs include both-side fees, size-specific slippage and expected inventory rebalance cost.

Rebalance estimator after evidence: P75 of latest 30 reconciled rebalance-cost percentages, minimum 10. Before minimum sample use fallback 0.02% and mark the fact FALLBACK.

`expectedNetPct = grossSpreadPct - totalExpectedCostPct - totalReservePct`

## Qualification

- expectedNetPct >=0.06%;
- maxNotionalUsd >=2,000;
- per-leg slippage <=5 bps;
- snapshot age <=750ms CEX/CEX or <=1500ms if chain venue included;
- required inventory/settlement currency already present;
- canonical delta mismatch after rounding within execution policy;
- post-trade inventory/concentration passes;
- margin evidence required only when a derivative/margined leg is used;
- no hard risk block.

Repeatability = `CONDITION_DEPENDENT`.

## Expiry / exit

A not-yet-submitted Opportunity expires at `freshUntil`. Open inventory resulting from an executed pair is managed/rebalanced under execution/portfolio rules; no expired quote remains executable.
