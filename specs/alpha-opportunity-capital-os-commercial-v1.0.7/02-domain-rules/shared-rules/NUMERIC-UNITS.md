# Numeric Units Contract

This file is normative.

- Fields ending in `Pct` use **percentage points**, not decimal fractions. Example: `0.08` means **0.08%**.
- Fields ending in `Bps` use basis points. `8` means **8 bps = 0.08%**.
- Fields ending in `RateDecimal` use decimal fractions. `0.0008` means **0.08%**.
- USD notionals are positive absolute values unless a field explicitly states signed exposure.
- All timestamps are UTC epoch milliseconds internally; ISO-8601 UTC is allowed at API boundaries.
- Annualized values are display/comparison outputs only; qualification must use holding-period economics as specified by each strategy.
- Rounding happens only at venue-order construction using venue tick/lot rules. Formula engines use full precision decimals.
