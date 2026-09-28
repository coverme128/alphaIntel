# Execution Rules

## Modes

### PAPER
Uses live or replayed market inputs but no venue trade requests. Must simulate fees, book depth, partial fills and strategy timeouts.

### ASSISTED
System builds and revalidates the exact order plan; owner provides explicit confirmation immediately before submission.

### AUTO
Uses the same execution engine, with confirmation replaced by an already-saved explicit numeric policy. AUTO may not infer policy from chat.

## Multi-leg safety

Each strategy defines:

- preferred first leg or simultaneous/batched submission policy;
- maximum tolerated unhedged notional;
- maximum unhedged duration;
- partial-fill behavior;
- hedge/cancel/flatten fallback;
- final reconciliation.

## Idempotency

Every execution has a stable internal `execution_id` and per-leg `client_order_id`. Retries must never create duplicate economic orders.

## Pre-trade revalidation

Immediately before send, recalculate:

- executable price/depth;
- expected net return;
- capacity;
- risk blocks;
- balances/margin;
- opportunity freshness.

If the opportunity no longer qualifies, do not trade.

## Kill switches

- GLOBAL: blocks all new orders and AUTO entries.
- VENUE: blocks new activity on venue.
- STRATEGY: blocks strategy family/version.
- AUTO_ONLY: disables automation but leaves assisted/manual exits.

Kill switch activation must remain available even when AI is down.
