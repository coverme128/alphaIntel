# AI Contract — v1.0.7

**System owns Opportunity Truth. AI owns optional interpretation/extraction.**

AI is not a runtime dependency of the deterministic trading core.

## Supported product modes

- `CORE_ONLY`
- `AI_ENHANCED`

The full trading workflow MUST operate under `CORE_ONLY`.

## Allowed AI functions

1. explain qualified/rejected/expired opportunities from canonical analysis facts;
2. explain Capital Rotation / HOLD / EXIT reason codes;
3. explain expected-vs-realized P&L differences from canonical performance facts;
4. extract approved official exchange notices into reviewable `CandidateEventFact` records;
5. perform offline portfolio/performance commentary over exported canonical data;
6. assist strategy research outside runtime promotion gates.

## Removed from Commercial V1

AI MUST NOT provide a natural-language opportunity/portfolio query interface as a required product workflow. User constraints and preferences are configured through deterministic product controls.

## Mandatory facts boundary

For live product explanations, AI receives canonical `OpportunityAnalysisFacts`, portfolio/performance facts, validated reason codes, and optionally validated event facts.

AI MUST NOT recompute, invent, or override:

- expected net return;
- cost/reserve totals;
- capacity/recommended size;
- risk score/level;
- margin/liquidation facts;
- capital allocation/rotation;
- entry/exit trigger;
- realized P&L / Alpha Proof / Product Value status;
- venue/asset risk registry classifications.

## Official notice extraction

AI output is initially a `CandidateEventFact` and cannot directly change live eligibility.

A runtime-changing fact must pass deterministic validation and any required review before becoming `CanonicalEventFact`.

Generic news/sentiment/directional analysis is prohibited in V1 live logic.

## Provider failure

AI/provider outage MUST NOT block:

- market-data ingestion;
- opportunity qualification;
- risk controls;
- Capital Rotation;
- execution/exit;
- kill switch;
- P&L/reconciliation;
- alerts;
- Decision & Analysis Export.
