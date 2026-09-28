# Production Deployment

## Recommended first deployment

A small, single-region production deployment is sufficient for PRIVATE launch:

- 2 application instances or one application + warm standby;
- managed PostgreSQL with PITR;
- KMS/secret manager;
- monitoring/alerting;
- HTTPS reverse proxy/load balancer;
- scheduled backups;
- outbound network access to venue APIs.

Do not introduce Kubernetes unless existing infrastructure already standardizes on it.

## Process roles

A modular monolith may run:

- API/UI backend;
- market stream worker;
- opportunity evaluator;
- execution/monitoring worker.

They can be separate processes/containers from one codebase. Execution worker should have stricter secret access than public API/web process.

## Time

All servers use NTP. Store UTC timestamps. Exchange clock drift is measured and surfaced because signed trade requests can be time-sensitive.
