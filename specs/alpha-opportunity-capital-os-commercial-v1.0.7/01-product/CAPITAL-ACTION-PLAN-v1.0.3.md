# Capital Action Plan v1.0.3

## Primary user output

The product's primary decision output is a `CapitalActionPlan`, not a raw opportunity list.

It answers:

1. current allocation;
2. proposed target allocation;
3. exact moves required;
4. expected after-cost incremental benefit;
5. portfolio risk after change;
6. why each move is recommended;
7. execution mode and required confirmation;
8. conditions that cancel the plan.

## Move types

- `HOLD`
- `ALLOCATE_CASH`
- `REDUCE`
- `EXIT`
- `ROTATE`
- `MOVE_TO_YIELD`
- `KEEP_CASH`

## Example semantics

A rotation from Funding to Basis is proposed only when the deterministic rotation policy shows positive after-cost incremental benefit and all exit/entry/risk constraints pass. Headline APR differences are never sufficient.

## Modes

- `GUIDED`: show steps; owner executes externally.
- `ASSISTED`: system prepares canonical orders; owner confirms once.
- `AUTO`: system executes within saved numeric policy after strategy/portfolio AUTO promotion.

`AUTO` never means LLM discretion.
