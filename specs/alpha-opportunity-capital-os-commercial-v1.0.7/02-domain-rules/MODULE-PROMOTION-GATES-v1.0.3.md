# Module Promotion Gates v1.0.3

Module promotion is additive to strategy promotion and Alpha Proof. A UI toggle cannot bypass these gates.

## CONTRACT_READY → IMPLEMENTED

Requires:

- normative strategy contracts and schemas;
- deterministic formulas;
- Golden Fixtures;
- market-data/source contract;
- risk and P&L attribution rules;
- replay implementation.

## IMPLEMENTED → allocation ADVISORY

Requires relevant strategy versions to be at least PAPER_APPROVED and replay/paper evidence sufficient for recommendation display. Economic state may remain UNPROVEN but the UI must say so.

## allocation ADVISORY → LIVE

Requires the strategy used for the move to be ASSISTED_APPROVED (or AUTO_APPROVED for automatic execution), live account support, execution reconciliation and owner policy eligibility.

## AUTO_REBALANCE

Requires:

- target strategy AUTO_APPROVED;
- source position deterministic exit path;
- saved numeric portfolio policy;
- kill switch and incident gates;
- no module with `executionCeiling != AUTO` may be auto-selected.

## Structured/Options

No promotion is authorized by this v1.0.3 bundle. Their default states remain disabled until a dedicated implementation/domain pack is issued.
