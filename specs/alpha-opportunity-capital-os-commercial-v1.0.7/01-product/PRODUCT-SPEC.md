# Product Specification

## Product promise

“Tell me where the best executable, risk-bounded crypto opportunities are now, how much capital they can absorb, what can go wrong, and how to execute/exit them.”

## Primary jobs

### Job A — Find
Continuously scan supported venues and surface only opportunities passing deterministic qualification.

### Job B — Understand
Show the return source, exact assumptions, costs, capacity, duration, risk factors and invalidation conditions.

### Job C — Decide
Compare opportunities on a unified basis and recommend a capital allocation that respects the owner’s explicit risk policy.

### Job D — Act
Generate a canonical action plan and support PAPER, ASSISTED and constrained AUTO execution.

### Job E — Monitor
Track legs, positions, funding, basis, liquidity and exit conditions.

### Job F — Learn
Reconcile expected and realized P&L and expose model error by strategy, venue and symbol.

## Launch users

### PRIVATE Owner
Single principal using personal accounts/capital. Full access to configuration, execution and diagnostics.

### Future PUBLIC User
Uses isolated credentials, personal risk policy and an eligibility layer. Not part of the initial launch gate.

## Core surfaces

### Primary owner navigation — v1.0.6

1. **Today** — current capital, max three primary actions, positions requiring attention, month P&L/value summary.
2. **Opportunities** — unified `For You` feed and opportunity detail; strategy-module browsing is secondary.
3. **Positions** — active positions, attention/exit states and closed history.
4. **Portfolio** — current vs target allocation, capital rotation, venue inventory readiness and risk-budget summary.
5. **Performance** — realized P&L, benchmark/excess return, drawdown, cost attribution and product-value state.

### Contextual / Advanced surfaces

- **Execution detail** — order/leg state and recovery details, entered contextually from an Action/Position rather than primary navigation.
- **Replay Lab** — historical replay and paper evidence.
- **Connections** — venue credentials/status, permissions, rate limits and freshness.
- **Risk & Automation** — explicit limits, strategy allowlist, AUTO policy and kill switch.
- **Modules / Readiness** — Carry/Yield and future Structured/Options readiness/configuration.
- **Calculation Trace** — professional formula/input/config trace.
- **AI settings** — provider/model/configuration. AI explanations remain contextual in the primary flow.

The v1.0.6 owner must not need any Advanced surface to understand the next recommended action or to complete normal ASSISTED execution.

## Non-goals

- price-direction prediction as a launch feature;
- autonomous LLM decision-making;
- general charting replacement for TradingView;
- HFT/co-location;
- custody;
- withdrawals;
- copying arbitrary third-party strategies;
- promising any target return.

## Product survival principle (v1.0.5)

The PRIVATE product must justify itself with live evidence. Alpha is the primary success criterion. If Alpha is absent, the system may remain only when material risk reduction or operational efficiency is proven; otherwise the formal decision is `STOP_PRODUCT`. Opportunity volume is never product value.

