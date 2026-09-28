# Module Registry Contract v1.0.3

Each Alpha module has independent state dimensions. Do not collapse them into one `status` field.

## Required state axes

- `implementationStatus`: CONTRACT_READY | IMPLEMENTED | DISABLED
- `economicStatus`: UNPROVEN | REPLAY_POSITIVE | PAPER_POSITIVE | LIVE_POSITIVE | ALPHA_VALIDATED | EVIDENCE_INSUFFICIENT | INVALIDATED
- `executionCeiling`: DISABLED | PAPER | ASSISTED | AUTO
- `allocationEligibility`: DISABLED | ADVISORY | LIVE

## V1 baseline

- CARRY: delivered as CONTRACT_READY / UNPROVEN / execution DISABLED / allocation DISABLED. Codex promotes to IMPLEMENTED only after formula, adapter and Golden Fixture gates pass; later execution/allocation states follow strategy promotion.
- YIELD: delivered as CONTRACT_READY / UNPROVEN / execution DISABLED / allocation DISABLED. Codex promotes only through the same explicit readiness gates.
- STRUCTURED: CONTRACT_READY, economic UNPROVEN, execution DISABLED, allocation DISABLED.
- OPTIONS: CONTRACT_READY, economic UNPROVEN, execution DISABLED, allocation DISABLED.

A module cannot promote itself. Promotion requires the applicable strategy/economic gates and an explicit registry update.
