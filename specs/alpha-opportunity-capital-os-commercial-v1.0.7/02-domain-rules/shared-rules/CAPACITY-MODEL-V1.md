# Capacity & Size Economics Model v1.0.4

## Definition

`rawCapacityUsd` is the largest strategy notional for which every required leg satisfies venue order rules, slippage, available balance/margin, delta tolerance and portfolio limits.

Depth capacity is deterministic order-book walking, not 24h volume.

`maxNotionalUsd = floorToVenueRules(rawCapacityUsd * 0.95)`

The 5% quote-to-submit haircut remains frozen for V1.

## Multi-leg rule

Strategy capacity is the minimum capacity across legs **after canonical exposure normalization** from `INSTRUMENT-NORMALIZATION-V1.md`.

## Economics-by-size curve

Evaluate at configured bands `1k/5k/10k/25k/50k/100k USD` where feasible, plus the allocator-requested size when depth is available.

For each size persist:

- `notionalUsd`
- `grossPct`
- `executableGrossPct`
- `slippagePct`
- `totalExpectedCostPct`
- `totalReservePct`
- `expectedNetPct`
- `expectedPnlUsd`
- `qualifiedAtSize`
- `failureReasonCodes`

`expectedPnlUsd(size) = size * expectedNetPct(size) / 100`

## Conservative lookup

No optimistic interpolation and no extrapolation above the largest measured executable size.

When an exact requested size is not evaluated, use the next larger measured band's economics if available. If no larger band exists, the size is not proven executable.

## Marginal economics

When increasing an existing allocation from A to B:

`marginalExpectedPnlUsd = expectedPnlUsd(B) - expectedPnlUsd(A)`

`marginalExpectedNetPct = marginalExpectedPnlUsd / (B-A) * 100`

The allocator must not add an increment whose marginal expected net is non-positive or causes the resulting total size to fail strategy qualification.
