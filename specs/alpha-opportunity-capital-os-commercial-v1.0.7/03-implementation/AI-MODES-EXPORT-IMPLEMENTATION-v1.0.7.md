# AI Modes + Single Export Implementation — v1.0.7

## Runtime feature flags

```ts
type ProductIntelligenceMode = 'CORE_ONLY' | 'AI_ENHANCED';
```

Default for PRIVATE launch may be `CORE_ONLY` unless an AI provider is explicitly configured.

No trading-core service may depend on the AI provider health check.

## Export service

One application service:

```ts
DecisionAnalysisExportService.generate({
  ownerId,
  windowStart,
  windowEnd
}) => DecisionAnalysisExport
```

One user action:

`Export Decision & Analysis`

One file format:

`application/json`

Do not implement format selection.

## Export composition

The export service reads already-persisted canonical facts and projections. It MUST NOT invoke strategy calculators to reconstruct historical values.

Recommended read sources:

- current portfolio snapshot;
- Capital Action records;
- canonical opportunity analysis facts;
- position/execution/P&L records;
- calculation fact + trace references;
- risk facts;
- Alpha Proof/Product Value records;
- validated event facts where present.

## Redaction

Before serialization apply an explicit export-safe projection. Secrets are deny-by-default.

Unit tests MUST prove that credential fields cannot appear in output.

## Official notice pipeline

Optional AI-enhanced path:

`Official notice source → extractor → CandidateEventFact → validator/review → CanonicalEventFact`

Candidate extraction is never directly executable truth.

`CORE_ONLY` path may create the same canonical event through deterministic/manual entry.

## No natural-language query endpoint

Do not create:

- portfolio chat endpoint;
- natural-language opportunity filter endpoint;
- prompt-to-risk-policy endpoint;
- prompt-to-order endpoint.
