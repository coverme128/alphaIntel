# Alpha Proof Gates v1.0.2

## Gate AP0 — ECONOMIC_INSTRUMENTATION_READY

- reconciled P&L components are complete;
- daily NAV/external-flow ledger exists;
- shadow benchmark engine exists;
- run-cost ledger exists;
- alpha-proof schemas/goldens pass.

## Gate AP1 — REPLAY_EVIDENCE_READY

- required replay coverage met or insufficiency explicitly reported;
- no silent zero/missing cost;
- chronological holdout preserved;
- replay report signed/hashed.

## Gate AP2 — PAPER_ECONOMICS_READY

- 30 live days minimum;
- positive benchmark-adjusted paper evidence;
- capture ratio and decay measured;
- no accounting drift.

## Gate AP3 — LIVE_ECONOMICS_READY

- 60 live days and minimum real cycles;
- realized net P&L positive;
- excess return positive;
- 100% terminal reconciliation;
- risk and execution-loss gates hold.

## Gate AP4 — ALPHA_VALIDATED

Must satisfy `VALIDATION-STAGES-v1.0.2.md` E4. Only this gate permits the UI to show `ALPHA_VALIDATED`.

## Gate AP5 — EXPANSION_WORTHY

Must satisfy `STOP-GO-RULES-v1.0.2.md`. Only AP5 authorizes building the next alpha family as a value-driven expansion rather than speculative feature growth.
