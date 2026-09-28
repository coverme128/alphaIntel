# Canonical Valuation Policy v1.0.4

All accounting and Alpha Proof values use USD as canonical valuation currency.

## Different purposes, different price facts

- actual fills/cashflows: use executed price / actual cashflow;
- derivative margin and liquidation controls: venue mark/margin facts;
- portfolio NAV and cross-asset comparison: canonical USD valuation price;
- fee assets: convert at event-time canonical valuation price.

## Canonical USD valuation hierarchy

For a supported asset at timestamp `t`:

1. approved consolidated USD/index price when available;
2. median of fresh executable mids from >=2 approved enabled venues;
3. one approved fresh venue mid only when policy explicitly allows single-source fallback;
4. no stale-price invention.

`mid = (bestBid + bestAsk) / 2`

If valuation evidence is missing beyond configured TTL, mark the asset `UNVALUED`. A NAV/TWR interval containing material unvalued assets is not Alpha-Proof eligible.

## Stablecoins

Never hard-code `1 stablecoin = 1 USD` for NAV, P&L or risk. USDT/USDC/other settlement assets use the same canonical valuation hierarchy.

## Event-time conversion

For a fee/cashflow amount `q` in asset A:

`usdValue = q * canonicalUsdPrice(A, eventTime)`

Persist raw amount, asset, USD conversion price, price source and timestamp.

## Materiality

Default unvalued-asset materiality gate is 0.10% of portfolio NAV. Above this, daily Alpha Proof status is `EVIDENCE_INSUFFICIENT` until reconciled.
