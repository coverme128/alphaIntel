# Observability

## Required metrics

### Market data
- connection uptime by venue/channel;
- last event age;
- sequence gaps/reconnects;
- REST recovery count.

### Opportunity
- candidates/qualified per strategy;
- qualification rejection reasons;
- expected net return distribution;
- modeled capacity;
- opportunity decay/revalidation failure.

### Execution
- submit latency;
- fill latency;
- partial-fill ratio;
- unhedged exposure duration;
- order rejection rate;
- recovery/manual-intervention count.

### P&L
- expected vs realized return error;
- fee/slippage model error;
- funding prediction/persistence error;
- realized P&L by strategy/venue/symbol;
- drawdown.

## Alerts

Critical alerts:

- stale market inputs while live positions require monitoring;
- private stream disconnected with active positions;
- unhedged exposure beyond threshold;
- reconciliation mismatch;
- unexpected withdrawal permission;
- kill-switch path failure;
- AUTO placed order outside saved policy (should be impossible).
