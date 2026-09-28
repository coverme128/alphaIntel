# Module Interfaces v1.0.3

## AlphaModule interface

Every implemented module must expose deterministic producers behind a common boundary:

```text
listCapabilities()
evaluate(snapshot, strategyConfig) -> Opportunity[]
explainEvidence(opportunityId) -> CanonicalEvidence
getReadiness() -> AlphaModuleState
```

Live execution remains owned by the shared Action Plan / Execution subsystem, not by module-specific UI code.

## Rules

- modules may not write orders directly;
- modules may not bypass Risk/Portfolio policy;
- module-specific data can extend evidence, but canonical Opportunity fields must remain populated;
- disabled modules must not publish allocation-eligible opportunities;
- AI is not an AlphaModule implementation.
