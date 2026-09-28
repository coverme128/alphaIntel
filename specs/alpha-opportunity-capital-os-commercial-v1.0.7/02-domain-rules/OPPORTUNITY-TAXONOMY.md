# Opportunity Taxonomy

## Canonical lifecycle

`OBSERVED → CANDIDATE → QUALIFIED → PLANNED → EXECUTING → ACTIVE → EXITING → CLOSED → RECONCILED`

Exceptional states:

`STALE`, `BLOCKED`, `FAILED`, `HEDGE_REQUIRED`, `MANUAL_INTERVENTION`, `CANCELLED`.

## Launch strategy families

### FUNDING_NEUTRAL
Long spot + short perpetual when positive funding economics are favorable; reverse structures are allowed only if venue/instrument mechanics and inventory rules support them.

### BASIS_CASH_CARRY
Long spot + short dated future to capture positive basis to expiry; reverse cash-and-carry is expansion-only unless borrow mechanics are fully modeled.

### CROSS_EXCHANGE_FUNDING
Offsetting perpetual positions on different venues to harvest net funding differential while bounding price delta.

### CROSS_EXCHANGE_SPREAD
Simultaneous low-ask buy and high-bid sell on pre-funded venues. Transfer-after-detection is not counted as executable arbitrage.

### IDLE_CAPITAL_YIELD
Allocate eligible idle stablecoin capital to approved yield products after liquidity, lockup and venue/protocol risk rules.

## Expansion families

- STRUCTURED_YIELD
- OPTIONS_VOLATILITY
- MARKET_MAKING
- EVENT_DISLOCATION

Expansion families must not appear as live-qualified opportunities until their strategy contracts and tests are promoted.
