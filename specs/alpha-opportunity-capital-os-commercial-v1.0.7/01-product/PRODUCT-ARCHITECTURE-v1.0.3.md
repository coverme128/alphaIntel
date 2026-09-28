# Product Architecture v1.0.3

## Frozen product model

**One Product, Multiple Alpha Modules, One Portfolio Brain.**

The user owns one portfolio and one risk policy. Strategy modules compete for that capital through a common Opportunity Contract; users do not need to operate separate products.

```text
Alpha Opportunity & Capital OS
├─ Today
├─ For You Opportunities
├─ Modules
│  ├─ Carry
│  ├─ Yield
│  ├─ Structured Products
│  └─ Options / Volatility
├─ Portfolio
│  ├─ Current Allocation
│  ├─ Capital Rotation
│  └─ Risk Budget
├─ Execution
└─ Performance / Alpha Proof
```

## Module semantics

- `CARRY`: V1 live-target family: Funding Neutral, Basis, Cross-exchange Funding, Cross-exchange Spread.
- `YIELD`: V1 live-target family: Idle-capital / Stablecoin Yield.
- `STRUCTURED`: built-in contract; default live state disabled.
- `OPTIONS`: built-in contract; default live state disabled.

A module is a producer of canonical opportunities. It does not own Portfolio, Risk, Execution, Account or P&L infrastructure.

## Portfolio Brain

The Portfolio Brain consists of:

1. eligibility filter;
2. comparable-return normalization;
3. risk/correlation/capacity constraints;
4. Capital Rotation decision;
5. target allocation;
6. Capital Action Plan;
7. execution-mode gate;
8. realized P&L and Alpha Proof feedback.

## User-facing principle

The default journey is **recommendation-first**, not module-first. Modules remain available for inspection and control, but Today/For You should answer:

- where is my capital now;
- what should change;
- what opportunities are executable now;
- exactly what action is required;
- when should the position exit;
- did the system generate excess economic value.
