# CROSS_EXCHANGE_FUNDING v1.0.4

Status: `DRAFT`.

## Structure

Offsetting perpetual positions on two pre-funded venues. Select sides that maximize conservative side-aware funding cashflow while canonical underlying delta remains within tolerance after rounding.

## Funding cashflow

For funding rate r:
- SHORT position cashflow = +r
- LONG position cashflow = -r

For latest 12 settled observations, minimum 8, convert historical rates to position cashflow before quantiles.

Receiving leg conservative cashflow:
`min(max(currentCashflow,0), Q25(max(historyCashflow,0)))`

Paying leg uses the lower/worse of current and historical conservative cashflow; never select the favorable value.

Use exact venue settlement schedules over planned 24h horizon.

`grossHoldingPeriodPct = expectedFundingDifferentialPct = sum(conservative side-aware event cashflows) * 100`

## Cost / reserve

Expected costs: two-venue entry/exit fees and size-specific slippage. Transfer-after-detection is prohibited.

`crossVenuePremiumReservePct = P75 adverse mark/index premium-differential change over planned horizon`; fallback 0.02% before replay calibration.

`expectedNetPct = grossHoldingPeriodPct - totalExpectedCostPct - totalReservePct`

## Qualification

- expectedNetPct >=0.10%;
- >=2 scheduled funding events total;
- maxNotionalUsd >=5,000;
- total entry slippage <=10 bps;
- abs cross-venue mark premium <=0.50%;
- post-rounding delta mismatch <=0.50%;
- both venues pre-funded/margin ready;
- margin evidence passes on both venues;
- no transfer dependency;
- no hard risk block.

Repeatability = `CONDITION_DEPENDENT`.

## Exit

- conservative next-8h continuation net <=0.02%;
- differential reverses for two observations spanning >=5 min;
- mark-premium divergence >0.75%;
- hold reaches 48h;
- live risk exit condition.
