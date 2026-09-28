# Structured Products Expansion Contract — Not a V1 Launch Blocker

Structured products should be implemented as a separate professional engine sharing the same Market Data, Portfolio, Risk, Execution and P&L core.

## Initial expansion scope

- Dual Investment / Buy Low / Sell High;
- covered call equivalents;
- cash-secured put equivalents;
- strike/target optimizer;
- tenor optimizer;
- conversion probability;
- scenario P&L;
- volatility-risk-premium comparison.

## Required model outputs

- headline APR;
- actual term yield;
- strike distance;
- estimated conversion probability;
- expected value under versioned distribution assumptions;
- scenario loss table;
- capital lock duration;
- liquidity/early-exit constraints;
- implied-volatility comparison where data supports it.

## Product rule

Do not compare a structured-product headline APR directly with a funding/basis APR. Normalize into expected holding-period return, liquidity, expected loss/tail risk and capital lock.

## Integration

Structured opportunities emit the same canonical `Opportunity` envelope and can later be consumed by Alpha Portfolio allocation, but their pricing engine is isolated from launch strategy formulas.
