# Operator Runbook

## Daily checks

- venue public/private connection health;
- stale input alerts;
- unreconciled executions;
- active positions versus venue positions;
- realized P&L attribution;
- API rate-limit pressure;
- kill switch state.

## Before enabling AUTO

1. confirm global kill switch OFF by deliberate action;
2. verify saved policy hash/version;
3. verify venue credential permissions;
4. verify active assisted execution history for strategy;
5. confirm no unresolved execution/reconciliation incident;
6. confirm monitoring alerts reach operator.

## Emergency stop

1. enable GLOBAL kill switch;
2. stop new AUTO/ASSISTED entries;
3. assess active positions independently;
4. do not blindly flatten if doing so increases risk;
5. execute strategy-specific safe exit/hedge;
6. reconcile venue state;
7. create incident record.
