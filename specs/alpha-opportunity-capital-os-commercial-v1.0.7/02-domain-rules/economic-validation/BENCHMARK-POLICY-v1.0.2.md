# Benchmark Policy v1.0.2

## Why a benchmark is mandatory

Positive P&L alone does not prove product value. The owner could have earned a return with a simpler alternative. Alpha Proof measures value relative to an explicit benchmark with comparable settlement asset and liquidity constraints.

## Launch benchmark hierarchy

The PRIVATE launch profile uses one canonical primary benchmark plus optional diagnostics.

### Primary — PASSIVE_STABLE_YIELD

A passive, non-trading yield path for the portfolio settlement asset, modeled from eligible owner-accessible products. It must:
- use the same base settlement asset where possible;
- include lock/redemption constraints;
- use net rate after known fees;
- exclude promotional teaser rates unless actually accessible for the measured capital;
- use time-varying observed rates, not a single end-of-period APR.

When no eligible passive yield series exists, use `OWNER_CONFIGURED_BENCHMARK`, and mark the report `benchmark_quality = CONFIGURED` rather than `OBSERVED`.

### Diagnostic benchmarks

- `ZERO_YIELD_CASH`: useful only to show absolute return, never sufficient for product-value approval when passive yield was available.
- `BUY_AND_HOLD`: optional directional comparator; not a primary benchmark for market-neutral strategies.
- `SIMPLE_CARRY`: optional strategy-family diagnostic where a reproducible passive/simple carry implementation exists.

## Shadow benchmark

The benchmark is implemented as a shadow portfolio receiving the same external cash-flow events as the actual portfolio. This prevents deposits/withdrawals from being mistaken for alpha.

## Benchmark changes

Changing the primary benchmark invalidates comparability across reports unless both old and new shadow series are recomputed over the overlapping period. Benchmark policy changes require a versioned correction pack.
