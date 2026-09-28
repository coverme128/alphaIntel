# Changelog — Commercial v1.0.3

This is a product-architecture freeze before the first Codex handoff. No existing v1.0.1 trading formula or v1.0.2 Alpha Proof rule is weakened.

## Added

- One Product / Multiple Alpha Modules / One Portfolio Brain architecture.
- Commercial V1 Capital Rotation Core.
- Unified Opportunity Feed and Capital Action Plan UX contracts.
- Module Registry with independent implementation/economic/execution/allocation states.
- Built-in Structured Products and Options module contracts, disabled from live execution/allocation by default.
- OFF / ADVISORY / AUTO_REBALANCE portfolio-rotation modes.
- churn-prevention and after-cost rebalancing rules.
- module interfaces, portfolio orchestration, UI ViewModels and readiness matrix.
- migration `003-module-portfolio-orchestration.sql`.

## Preserved unchanged

- v1.0.1 strategy economics and safety formulas;
- cost/capacity/risk/P&L accounting;
- execution state machine and kill switches;
- v1.0.2 economic-validation / Alpha Proof gates;
- initial venue scope: OKX, Binance, Bybit, Hyperliquid.

## Removed from interpretation

Capital Rotation is no longer treated as a future expansion. Structured/Options are no longer separate-product concepts; they are internal strategy modules of the same product.
