# Portfolio Orchestration v1.0.3

## Pipeline

```text
Eligible Module Opportunities
        ↓
Canonical Opportunity Store
        ↓
Allocator Score / Constraints
        ↓
Target Allocation
        ↓
Capital Rotation Guard
        ↓
PortfolioRecommendation
        ↓
CapitalActionPlan
        ↓
Guided / Assisted / Auto gate
        ↓
Execution State Machine
```

## Recalculation triggers

- new/expired qualified opportunity;
- material market/risk change;
- fill/exit/reconciliation event;
- funding/settlement event;
- owner policy update;
- periodic advisory refresh.

Do not continuously churn positions merely because ranking order changes.

## Idempotency

A recommendation is immutable and hashable. An Action Plan references exactly one recommendation/policy snapshot. Re-running the same inputs/config must produce the same deterministic recommendation.
