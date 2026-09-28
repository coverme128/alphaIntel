# Execution State Machine

## States

`CREATED → REVALIDATING → READY → SUBMITTING → PARTIAL → HEDGED → ACTIVE → EXIT_REQUESTED → EXITING → CLOSED → RECONCILING → RECONCILED`

Exceptional:

`ABORTED`, `FAILED`, `HEDGE_REQUIRED`, `MANUAL_INTERVENTION`.

## Core invariants

- an execution references exactly one immutable action plan;
- order retries use stable client IDs;
- partial fills update economic hedge exposure in real time;
- if maximum unhedged exposure/time is exceeded, strategy-specific recovery begins immediately;
- exit orders must be `reduce-only` where venue semantics support it;
- reconciliation is based on venue-confirmed fills/cashflows, not local order intent.

## Crash recovery

On restart:

1. load non-terminal executions;
2. query venue open orders/positions;
3. replay missed private events where possible;
4. reconcile local and remote state;
5. refuse new orders for an execution until state is resolved.
