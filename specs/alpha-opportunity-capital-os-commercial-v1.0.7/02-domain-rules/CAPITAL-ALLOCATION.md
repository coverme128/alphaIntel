# Capital Allocation & Rotation — Commercial v1.0.3

Capital allocation is a Commercial V1 core capability, not a future add-on.

## Goals

- keep a configured cash reserve;
- compare eligible opportunities across enabled Alpha modules;
- deploy capital only after modeled cost/risk/capacity checks;
- avoid excessive churn;
- rotate capital only when the after-cost incremental benefit is material;
- preserve explicit concentration/correlation limits;
- produce an auditable Capital Action Plan.

## V1 algorithm

1. remove blocked/stale/unqualified/module-ineligible opportunities;
2. compute the existing deterministic allocation score;
3. generate a target allocation subject to cash/risk/capacity constraints;
4. compare target allocation to current positions;
5. apply `CAPITAL-ROTATION-v1.0.3` churn guards and switching economics;
6. emit required moves and reasons;
7. leave capital in cash/yield when no better eligible action exists.

Sophisticated ML/mean-variance optimization remains explicitly out of V1.

## Output

- current vs target allocation;
- recommended moves;
- expected after-cost incremental benefit;
- expected turnover;
- risk/concentration after proposal;
- reasons for hold/cash/no-action;
- plan expiry and policy/config version.
