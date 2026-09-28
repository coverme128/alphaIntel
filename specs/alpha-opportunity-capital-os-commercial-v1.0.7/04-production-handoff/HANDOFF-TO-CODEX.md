# Handoff to Codex

## Instruction

Implement this release as a commercial production system, not a prototype. Follow `MASTER-CONTRACT.md` precedence and `03-implementation/CODEX-IMPLEMENTATION-PLAN.md` ordering.

### Must do

- preserve deterministic trading truth;
- implement public adapters before private execution;
- reuse the same formulas in live and replay;
- implement paper/assisted before auto;
- treat failure recovery, idempotency and reconciliation as core product behavior;
- preserve owner_id/portfolio identity for future public profile;
- keep Structured/Options registered as built-in modules but disabled from live execution/allocation; do not implement their strategy engines in this release.
- implement Capital Rotation as V1 core and make the default UX recommendation-first.

### Must not do

- add crawler infrastructure;
- add LLM-based trade decisions;
- build generic multi-tenant/org/billing systems now;
- add unsupported exchanges simply for connector count;
- introduce microservices/Kubernetes without a concrete operational need;
- market any strategy as guaranteed profit.

## Required final Codex report

1. implemented files/modules;
2. database migrations;
3. adapter capability matrix;
4. strategy test matrix;
5. security checks;
6. replay report;
7. assisted execution chaos report;
8. open blockers;
9. launch-gate status;
10. exact config/secret steps required from owner.


### v1.0.6 first-handoff rule

Because no prior version has been handed to Codex, treat this v1.0.6 bundle as the only implementation baseline. Do not implement v1.0.3 first and patch forward. Calculation Closure Batch 00C is mandatory before venue/strategy implementation.


### v1.0.4 Calculation/Facts first-handoff rule

Before Batch 01 market connectivity, implement Batch 00C from the implementation plan. `formula-contracts.v1.0.4.json`, `risk-policy.v1.0.4.yaml`, v1.0.4 calculation schemas and `golden-fixtures.v1.0.4.json` supersede older calculation artifacts where they conflict. Do not invent missing calculation semantics in code.

Before live ASSISTED testing, expose an explicit owner/operator setup step to approve venue and settlement-asset risk tiers. Seed UNREVIEWED values are intentional safety blocks, not missing implementation.

### v1.0.5 Product Value first-handoff rule

Implement Batch 00D as part of the baseline instrumentation. Do not treat risk reduction or time saving as trading Alpha. Keep `valueClassification`, `expansionDecision`, and `survivalDecision` separate. `STOP_PRODUCT` is a product-development verdict after sufficient evidence; it does not override canonical position-exit safety logic.

Use `alpha-thesis-priority.v1.0.5.yaml` for product emphasis only. It must never bypass strategy qualification, risk, module readiness or promotion gates.



### v1.0.6 Personal UX first-handoff rule

Read and freeze `01-product/PERSONAL-UX-CLOSURE-v1.0.6.md` and `01-product/ALERTS-AND-CAPITAL-INVENTORY-v1.0.6.md` during Batch 00E. This is a simplification contract, not a new trading domain.

- Primary navigation is limited to Today / Opportunities / Positions / Portfolio / Performance.
- Today shows at most three primary owner actions.
- Advanced/engineering/governance surfaces remain available but are not primary navigation.
- UI/ViewModel code must project canonical facts and must not recompute economics, risk or maturity.
- Owner alerts may notify; they may not bypass freshness, final revalidation, owner confirmation or execution policy.
- Capital Inventory is read-only/advisory in V1 and must not introduce transfer/withdrawal automation.
- AI is contextual explanation-on-demand; deterministic user workflow must remain complete when AI is unavailable.
