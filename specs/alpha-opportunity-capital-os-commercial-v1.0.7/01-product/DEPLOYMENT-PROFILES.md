# Deployment Profiles

## PRIVATE — Launch profile

- single owner;
- one installation / one logical tenant;
- no subscription/billing;
- multiple venue accounts allowed;
- full Paper/Assisted/Auto functionality;
- production credential vault and audit trail required;
- owner can change strategy thresholds through versioned configuration.

## PUBLIC — Future profile contract

PUBLIC adds, without changing opportunity truth:

- identity/authentication;
- per-user credential isolation;
- per-user eligibility and risk policies;
- subscription/entitlement;
- consent records;
- regional/legal product availability;
- support/admin workflows.

## Architectural rule

Core tables carry `owner_id`/`portfolio_id` from V1 so multi-user migration does not require changing opportunity/execution identity semantics. No organization/workspace/seat model is required in PRIVATE.
