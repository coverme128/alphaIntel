# AI Modes & Decision Analysis Export — v1.0.7

## Product principle

The trading product has one deterministic core and one optional AI enhancement layer.

`CORE_ONLY` is a complete product mode, not a degraded fallback.

`AI_ENHANCED` may improve notice processing and explanation, but MUST NOT be required for opportunity discovery, capital allocation, execution, exit, P&L, Alpha Proof, or product-value decisions.

## Modes

### CORE_ONLY

Available without an AI provider:

- market/account ingestion;
- all canonical calculations;
- opportunity qualification/rejection;
- risk/cost/capacity/margin calculations;
- Capital Rotation and Capital Action Plan;
- PAPER / ASSISTED / eligible AUTO execution;
- deterministic reason-code explanations;
- alerts;
- positions / exits;
- P&L / Alpha Proof / Product Value;
- Decision & Analysis Export.

### AI_ENHANCED

Adds only approved enhancements:

- official exchange notice extraction into reviewable structured candidate event facts;
- optional human-readable explanation over canonical facts;
- optional offline portfolio/performance commentary.

Natural-language opportunity/portfolio querying is OUT OF SCOPE for Commercial V1.

## Single export

The product exposes one export action:

**Decision & Analysis Export**

The action generates one file:

`alpha-capital-decision-analysis-<timestamp>.json`

No separate CSV, Markdown, ZIP bundle, or per-page export is required.

The file is intended for:

- owner archival;
- ChatGPT analysis;
- WorkBuddy analysis;
- other AI/analytics tools;
- reproducible human review.

The export MUST contain canonical outputs, not re-derived UI values.

## User experience

Recommended placement:

`Performance → Export Decision & Analysis`

Optional secondary access:

`Advanced → Data & Export`

The user does not select a format. One click creates the canonical JSON export.
