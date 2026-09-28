# Economic Validation Engine v1.0.2

## Service responsibility

A deterministic service computes economic evidence from reconciled executions, daily NAV snapshots, shadow benchmark NAV, costs and evidence lineage.

It never creates trades.

## Inputs

- reconciled executions/cashflows;
- daily portfolio NAV and external flows;
- benchmark daily return series;
- attributable run-cost ledger;
- risk/drawdown series;
- strategy/config/connector hashes;
- replay/paper/live run metadata.

## Outputs

- `AlphaProofReport` per portfolio and optional strategy family;
- evidence state transitions;
- stop/go/expand decision facts;
- dashboard timeseries;
- immutable report hash.

## Determinism

Same reconciled ledger + benchmark series + policy version must produce identical report values and report hash.

## No silent annualization

Do not annualize periods shorter than 30 days. For 30–89 days, label annualization `EARLY_SAMPLE`. From 90 live days onward label `LIVE_SAMPLE`; no label implies prediction.

## Data leakage

Replay parameters must be fixed before evaluating the holdout segment. Parameter changes create a new strategy/config hash and restart evidence for the changed version.
