# Product Value Metrics v1.0.5

## Alpha metrics

Normative source: existing Alpha Proof / TWR contracts.

- realized net P&L
- portfolio TWR
- benchmark TWR
- excess TWR
- annualized excess TWR when valid
- economic value USD
- capture ratio
- product run cost

## Risk metrics

Minimum V1 product-value metrics:

- system max drawdown %
- benchmark max drawdown %
- absolute drawdown improvement percentage points
- relative drawdown reduction %
- hard risk breaches count
- Severity-1 execution incidents count

Risk comparison is only valid when the portfolio and benchmark window use synchronized valuation boundaries.

## Operational metrics

- baseline manual hours
- actual manual hours
- hours saved
- manual time reduction %
- assisted/auto action share
- manual intervention count

Time is measured over the same report window and annualized only for display if the source window is >= 30 days.

## Optional owner monetary valuation

If `ownerTimeValueUsdPerHour` is explicitly configured:

`operationalValueUsd = manualHoursSaved * ownerTimeValueUsdPerHour`

This is owner utility, not trading P&L and not Alpha.

Risk value is not monetized by default. A future coefficient requires an explicit versioned owner policy and cannot be inferred by AI.
