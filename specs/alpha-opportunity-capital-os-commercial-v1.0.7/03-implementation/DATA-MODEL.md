# Data Model

## Core entities

### owner
Private-profile principal. Keep stable `owner_id` for future multi-user migration.

### venue_account
Venue, account identifier, credential reference, permission status, fee tier, health.

### instrument
Canonical symbol plus venue-native identifiers, type, tick/lot sizes, settlement asset, expiry.

### market_snapshot
Short-retention snapshots used for opportunity evidence and replay references.

### strategy_version
Immutable promoted strategy contract/config hash.

### opportunity
Canonical candidate/qualified object with input snapshot references, return/cost/capacity/risk outputs.

### action_plan
Immutable plan generated from one opportunity plus one portfolio policy snapshot.

### execution
State machine instance.

### execution_leg
Venue order intent and lifecycle.

### strategy_position
Economic position grouping multiple venue positions/legs.

### cashflow
Fee, funding, borrow/yield, transfer/rebalance and settlement events.

### pnl_reconciliation
Expected vs realized attribution and completeness status.

### risk_policy
Versioned owner risk limits.

### kill_switch_event
Immutable activation/deactivation record.

## Identity rule

Never use a venue order ID as the primary domain identity. Internal stable IDs own the lifecycle and store venue IDs as attributes.


### alpha_module_state (v1.0.3)
Independent implementation/economic/execution/allocation readiness for each Alpha module.

### portfolio_recommendation (v1.0.3)
Immutable current→target portfolio recommendation including policy/config hashes, expected turnover and risk-after snapshot.

### capital_action_plan (v1.0.3)
Immutable executable/user-guided moves derived from one portfolio recommendation. It is distinct from the existing single-opportunity `action_plan` and may orchestrate multiple actions.
