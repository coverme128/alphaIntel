# Instrument & Exposure Normalization Contract v1.0.4

Raw venue quantities cannot be compared across venues. Every adapter MUST normalize instruments before any multi-leg sizing.

## Required canonical instrument facts

- venue / venue symbol
- canonical underlying asset
- settlement asset
- instrument type
- contract model: `SPOT | LINEAR | INVERSE`
- venue quantity unit: `BASE | CONTRACTS`
- tick size / quantity step / minimum quantity / minimum notional
- `basePerContract` when contract count maps to base quantity
- `usdPerContract` for inverse USD-value contracts
- instrument status

## Side sign

- BUY/LONG = `+1`
- SELL/SHORT = `-1`

## Exposure formulas

### Spot or base-quantity linear instrument

`baseExposure = sideSign * venueBaseQty`

### Linear contracts with base-per-contract

`baseExposure = sideSign * contracts * basePerContract`

### Inverse USD-value contract

`baseExposureApprox = sideSign * contracts * usdPerContract / markPrice`

`usdNotional = abs(contracts * usdPerContract)`

For spot/linear:

`usdNotional = abs(baseExposure * markPrice)`

`deltaUsdApprox = baseExposure * markPrice`

Options are CONTRACT_READY only. When enabled later, option delta MUST be applied to underlying base exposure before entering shared portfolio exposure calculations.

## Multi-leg mismatch

After venue rounding:

`netDeltaUsd = sum(deltaUsdApprox across legs)`

`deltaMismatchPct = abs(netDeltaUsd) / targetStrategyNotionalUsd * 100`

The strategy threshold is evaluated on the rounded executable quantities, not requested quantities.

## Rounding

Quantity is rounded in the safer direction required by the execution policy. A rounded order that violates min quantity/notional or increases delta mismatch beyond the strategy limit is not executable.
