# Decision & Analysis Export Contract — v1.0.7

## Objective

Create one portable, canonical, machine-readable file that captures the facts required to analyze owner decisions and realized results outside the product.

## File

Exactly one JSON file per export:

`alpha-capital-decision-analysis-<timestamp>.json`

UTF-8, JSON, schema-versioned.

## Required sections

- `metadata`
- `portfolio`
- `capitalActions`
- `opportunities`
- `positions`
- `performance`
- `riskFacts`
- `calculationFacts`
- `calculationTraces`
- `productValue`
- `eventFacts` when present

## Canonical-only rule

Every numeric field that affects a trading/portfolio decision MUST either:

- reference a canonical observed fact; or
- reference a canonical calculation fact / trace ID.

The export MUST NOT re-run formulas or recalculate presentation values.

## Minimum metadata

- export schema version;
- product version;
- generatedAt;
- valuation currency;
- evidence/economic status;
- included time window;
- strategy/config versions;
- source snapshot identifiers sufficient for internal reproducibility.

## Privacy/security exclusions

Never export:

- API key/secret/passphrase;
- auth/session token;
- withdrawal credential;
- private signing material;
- encrypted secret ciphertext;
- internal infrastructure credentials;
- raw exchange request signatures.

Order IDs / venue account aliases may be pseudonymized when not necessary for analysis.

## External AI use

The export is intentionally provider-neutral. External AI systems may interpret the file, but their output does not become canonical trading truth unless separately validated and imported through an explicit governed workflow.
