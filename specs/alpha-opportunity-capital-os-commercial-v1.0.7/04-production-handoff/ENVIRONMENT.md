# Environment & Secrets

## Environments

- `local`
- `test`
- `paper-prod` — production feeds, no real orders
- `live-prod`

Paper and live MUST use distinct configuration and credentials.

## Required secret classes

- DB credentials;
- encryption/KMS key reference;
- venue API credentials;
- AI provider key (optional/noncritical);
- monitoring credentials.

## Live enablement

Live execution requires an explicit environment-level feature flag plus owner policy. Database data alone cannot accidentally enable live trading in a non-live environment.
