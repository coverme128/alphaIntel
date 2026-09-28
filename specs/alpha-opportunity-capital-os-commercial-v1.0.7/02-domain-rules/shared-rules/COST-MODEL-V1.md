# Cost & Reserve Model v1.0.4

## Core separation

Opportunity economics distinguish **expected economic costs** from **conservative model reserves**.

`expectedNetPct = grossPct - totalExpectedCostPct - totalReservePct`

A reserve is not represented to the user as an already-paid fee.

## Expected cost components

- entry trading fees;
- expected exit / settlement fees;
- entry depth-derived slippage;
- expected exit slippage;
- borrow/financing interest;
- transfer/network cost only when strategy permits it;
- realized-history based rebalance cost estimate;
- structured product subscription/redemption fee when later enabled.

`totalExpectedCostPct = sum(expected cost components)`

## Reserve components

- basis adverse reserve;
- cross-venue premium divergence reserve;
- liquidity uncertainty reserve when explicitly allowed by strategy policy;
- emergency hedge reserve;
- model uncertainty reserve.

`totalReservePct = sum(reserve components)`

## Fee source

Use user/account-specific actual fee tier when available. A conservative configured fallback is allowed for PAPER/candidate calculation. ASSISTED/AUTO is blocked when required fee facts are stale unless pinned to a verified static schedule version.

## No double counting

When gross uses top-of-book and executable gross uses VWAP, top-to-VWAP difference is slippage. Do not subtract a second static slippage estimate.

Static slippage fallback is PAPER-only for trading strategies when full depth is unavailable.

## Rebalance reserve estimator

For cross-venue inventory strategies after enough reconciled observations:

- rolling window: latest 30 reconciled rebalance events, minimum 10;
- estimator: P75 of absolute rebalance-cost percentage;
- if fewer than 10 observations, use configured fallback;
- estimator version and sample count are persisted in Calculation Facts.

## Fee currency

Normalize costs to USD-equivalent at event time under `VALUATION-POLICY-V1.md`; retain raw amount and asset for reconciliation.
