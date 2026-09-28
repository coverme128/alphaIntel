# IDLE_CAPITAL_YIELD v1.0.4

Status: `DRAFT`.

## Scope

Approved exchange-native stablecoin yield products with machine-readable or manually versioned terms. Unknown DeFi/protocol products remain expansion scope.

## Rate normalization

APR quote:
`productTermReturnPct = aprPct * termDays / 365`

APY quote:
`productTermReturnPct = ((1 + apyPct/100)^(termDays/365) - 1) * 100`

Apply the same quote-type rule to baseline reserve return.

`incrementalNetPct = productTermReturnPct - baselineTermReturnPct - totalExpectedCostPct`

Risk is separate; do not subtract a synthetic monetary risk penalty.

For flexible products use a 30-day comparison horizon while explicitly preserving redemption availability.

## Qualification

- product allow-listed;
- settlement asset approved Tier A/B for live;
- lock <=7 days or flexible;
- redemption <=24h;
- annualized incremental rate >=2.0 percentage points;
- holding-period incremental net >=0.05%;
- product capacity/account balance known;
- data fresh;
- no hard risk block.

Repeatability = `CONTRACTUAL_RECURRING` only while the product remains available; quoted rate variability remains explicit.

## Exit / roll

- fixed term: maturity triggers redemption/settlement and a new opportunity evaluation;
- flexible: Capital Rotation or risk rule may redeem/reallocate;
- no automatic roll without a newly qualified opportunity.

Default live execution ceiling remains ASSISTED until subscribe/redeem/reconciliation are deterministic.
