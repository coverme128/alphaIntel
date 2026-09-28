# Official Notice Scope — v1.0.7

## Why notices exist in scope

Only notices that can invalidate trading facts, execution safety, or market eligibility belong in V1.

## Included official notice classes

- delisting / contract termination;
- trading suspension / resume;
- funding interval change;
- funding cap/floor or funding formula change;
- contract multiplier / tick size / lot size / minimum-notional change;
- settlement / expiry rule change;
- margin / maintenance-margin / leverage-rule change;
- API or trading service degradation/maintenance that affects execution or exit;
- deposit/withdrawal suspension only when it materially affects capital readiness/rebalancing assumptions.

## Excluded

- general crypto news;
- macro news;
- social sentiment;
- KOL/Twitter/Telegram content;
- project marketing announcements;
- directional price prediction;
- generic listing hype/event alpha.

## AI boundary

AI may parse an official notice into a candidate structured event. It does not independently change opportunity truth.

Runtime-changing path:

`Official Source → CandidateEventFact → Deterministic Validation / Required Review → CanonicalEventFact → Rule Engine`

If AI is disabled, the same CanonicalEventFact may be created through deterministic source fields or manual owner/admin confirmation.
