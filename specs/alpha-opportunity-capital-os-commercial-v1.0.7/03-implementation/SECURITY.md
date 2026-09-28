# Security Contract

## Credential controls

- credentials encrypted at rest using envelope encryption/KMS or equivalent;
- secrets never returned by application APIs after creation;
- secret values redacted from logs, traces, errors and AI context;
- browser receives no exchange secrets;
- withdrawal permission prohibited;
- separate credential references from account/domain records;
- key rotation supported without recreating historical records.

## Trading controls

- all live order endpoints require server-side risk revalidation;
- UI cannot bypass policy by crafting API requests;
- short-lived assisted-confirmation token is plan-hash-bound;
- AUTO policy changes require deliberate owner action and are audit logged;
- kill switch path must not depend on AI or nonessential queues.

## Network

- outbound allowlisting where practical;
- TLS only;
- strict dependency and image scanning;
- rate-limit and abuse protection even for single-owner deployment.

## Data

Do not store unnecessary identity/KYC data from exchanges. Store only data needed for accounts, execution and reconciliation.
