# Incident Playbook

## One leg filled, hedge leg failed

- mark `HEDGE_REQUIRED`;
- stop new entries for strategy/venue as policy dictates;
- recompute unhedged delta/notional;
- retry hedge only within idempotent/price-risk limits;
- otherwise execute fallback flatten/alternate-venue hedge if explicitly supported;
- require manual intervention when uncertainty exceeds policy.

## Private stream lost

- do not assume orders failed;
- switch execution to degraded/reconciliation mode;
- query REST order/position state;
- pause new execution on venue until state is authoritative.

## Market stream stale

- mark affected opportunities STALE;
- block new entries;
- existing positions continue with alternate/snapshot monitoring policy or manual intervention.

## Database outage

- trading worker must fail safe for new orders;
- do not issue untracked new entries;
- venue/account state is reconciled after DB recovery.

## AI outage

No trading incident. Disable AI features and fall back to deterministic text templates.
