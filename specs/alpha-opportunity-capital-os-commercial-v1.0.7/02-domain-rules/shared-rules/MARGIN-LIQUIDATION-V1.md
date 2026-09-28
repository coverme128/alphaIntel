# Margin & Liquidation Contract v1.0.4

Delta-neutral at portfolio level does not remove venue-level liquidation risk.

## Required live derivative facts

At least one deterministic venue-supported margin evidence path is required:

A. venue reports maintenance margin and liquidation price; or
B. venue reports maintenance margin / margin ratio plus sufficient account equity data to compute the stress buffer.

Model-only liquidation estimates are PAPER-only.

## Core metrics

`effectiveLeverage = derivativeNotionalUsd / max(allocatedDerivativeEquityUsd, 0.01)`

`maintenanceCoverage = accountEquityUsd / max(maintenanceMarginUsd, 0.01)`

`marginBufferUsd = accountEquityUsd - maintenanceMarginUsd - pendingFeeReserveUsd`

When liquidation price is available:

`liquidationDistancePct = abs(liquidationPrice - markPrice) / markPrice * 100`

V1 default stress move for an individual derivative venue account is 5%:

`stressLossUsd = abs(derivativeDeltaUsd) * 0.05`

`postStressMarginBufferUsd = marginBufferUsd - stressLossUsd`

## Hard blocks

Live entry is blocked when any is true:

- `marginBufferUsd <= 0`
- `postStressMarginBufferUsd <= 0`
- `maintenanceCoverage < 1.25`
- known `liquidationDistancePct <= 2.0`
- required margin evidence is unavailable/stale
- venue account would exceed saved leverage/risk policy

## Margin risk score

Use the worst applicable bucket across leverage, maintenance coverage, liquidation distance and stress buffer.

Leverage bucket:
- <=1.0x → 0
- <=1.25x → 25
- <=1.50x → 50
- <=2.0x → 75
- >2.0x → 100

Maintenance coverage bucket:
- >=4.0x → 0
- >=3.0x → 25
- >=2.0x → 50
- >=1.5x → 75
- <1.5x → 100

Liquidation-distance bucket when available:
- >=25% → 0
- >=15% → 25
- >=10% → 50
- >=5% → 75
- <5% → 100

Stress-buffer ratio:

`stressBufferRatio = postStressMarginBufferUsd / max(accountEquityUsd,0.01)`

- >=50% → 0
- >=35% → 25
- >=20% → 50
- >=10% → 75
- <10% → 100

Hard-block rules override the bucket score.
