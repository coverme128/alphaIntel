# Calculation Trace Contract v1.0.4

Calculation trace is intentionally lightweight. It is not a document-evidence platform.

## Purpose

A user, operator, replay engine and AI explanation must be able to answer:

- what was calculated;
- which formula/version was used;
- which inputs were used and when they were observed;
- which policy/config version was active;
- whether inputs were observed, modeled or fallback;
- whether the result can be reproduced.

## Canonical objects

### Observed fact

An observed fact is a normalized venue/account/product fact and includes:

- `factId`
- `name`
- `value`
- `unit`
- `sourceType`
- `sourceRef`
- `observedAt`
- `quality = OBSERVED`

### Derived calculation fact

A derived fact additionally includes:

- `formulaId`
- `formulaVersion`
- `inputFactIds`
- `inputSnapshotHash`
- `configHash`
- `computedAt`
- `quality = DERIVED | MODELED | FALLBACK`

## Reproducibility hash

`inputSnapshotHash = SHA256(canonical_json(sorted_input_facts + formula_id + formula_version + config_hash))`

Canonical JSON means UTF-8, stable key ordering and no locale-dependent number formatting. Implementations may store raw snapshots separately; the hash must reference the exact input set used.

## User/AI display

Do not show hashes by default. The user-facing trace is the readable calculation breakdown. Hashes and source references are available under advanced/audit view.

AI receives facts and reason codes, not permission to invent missing inputs. Missing required facts produce `EVIDENCE_INSUFFICIENT` or a strategy-specific blocked state.
