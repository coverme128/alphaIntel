# Product Survival Runbook v1.0.5

## Cadence

- Before 90 live days: report `EVIDENCE_INSUFFICIENT`.
- At/after 90 days: evaluate value classification.
- At/after 120 days: STOP_PRODUCT becomes eligible if no material value exists.
- Expansion remains tied to the stricter existing Alpha Proof expansion gate.

## Actions by decision

### CONTINUE
Maintain current validated scope. Do not automatically add modules.

### KEEP_REDUCED_SCOPE
Keep the system for Risk/Capital OS or automation value. Freeze Alpha expansion unless it later satisfies `EXPANSION_WORTHY`.

### STOP_PRODUCT
- disable new strategy engineering;
- preserve data/export/reconciliation;
- do not abruptly close positions outside canonical exit/risk policy;
- archive final ProductValueReport and configs;
- document why Alpha, risk and automation gates failed.

Safety STOP_TRADING can occur earlier and is separate from STOP_PRODUCT.
