# Alpha Proof Contract v1.0.2

## Purpose

This contract answers one question for the PRIVATE owner profile:

> Does the system create repeatable, net, benchmark-adjusted economic value after all observable costs and operational failures?

Software readiness and profitability are separate facts. A production-ready engine starts with `economic_status = UNPROVEN`.

## Economic evidence states

`UNPROVEN → REPLAY_POSITIVE → PAPER_POSITIVE → LIVE_POSITIVE → ALPHA_VALIDATED`

Terminal/control states:

- `DO_NOT_EXPAND`: the system may remain useful operationally, but incremental economic value is too small to justify further strategy expansion.
- `INVALIDATED`: previously positive evidence no longer meets live economic gates.
- `EVIDENCE_INSUFFICIENT`: required synchronized data or sample coverage is unavailable.

No state may be inferred by AI. Promotion is deterministic from signed validation reports.

## Core economic identities

For each execution/cycle:

`realized_net_pnl = price_pnl + funding_pnl + yield_pnl + explicit_cashflows - trading_fees - borrow_cost - transfer_rebalance_cost - execution_loss - other_costs`

For the portfolio, return is measured with daily cash-flow-adjusted TWR. External deposits/withdrawals are not trading profit.

A shadow benchmark portfolio receives the same external cash-flow events.

`excess_return = portfolio_twr - benchmark_twr`

`economic_value_usd = ending_nav_actual - ending_nav_shadow_benchmark - attributable_run_cost_usd`

`value_to_run_cost_ratio = max(0, excess_value_before_run_cost_usd) / max(run_cost_usd, epsilon)`

Headline APR/APY, detected opportunity count, expected P&L and unrealized P&L never qualify as Alpha Proof.

## Alpha proof versus expansion value

`ALPHA_VALIDATED` means live evidence supports positive benchmark-adjusted value under the configured risk budget. It does not mean future returns are guaranteed.

`EXPANSION_WORTHY` is a separate decision: the system must exceed the stronger owner-value thresholds in `STOP-GO-RULES-v1.0.2.md`. A strategy may be alpha-positive but still not worth further engineering.

## Required evidence lineage

Every report stores:
- market-data hashes and coverage summary;
- strategy/config hashes;
- connector versions;
- fee tier and fee-source timestamps;
- slippage/capacity assumptions;
- benchmark policy hash;
- risk-policy hash;
- start/end NAV and external flows;
- all P&L components;
- all excluded periods with reason codes.

## Prohibited claims

The product may not show `ALPHA_VALIDATED`, annualized performance, or benchmark superiority unless the report meets the observation/sample rules for that state. AI explanations must quote the canonical status and cannot upgrade it.
