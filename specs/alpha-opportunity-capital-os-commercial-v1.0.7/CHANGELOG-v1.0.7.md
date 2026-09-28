# CHANGELOG — Commercial v1.0.7

## AI Optional + Single Decision & Analysis Export Closure

This release does not change any strategy formula, risk calculation, execution gate, Alpha Proof rule, venue scope, or strategy eligibility.

### Product decisions frozen

1. AI is optional. The deterministic product core MUST remain fully usable when AI is disabled or unavailable.
2. Natural-language portfolio/opportunity query is removed from Commercial V1 scope.
3. The product exposes exactly one analysis export action: **Decision & Analysis Export**.
4. That export produces exactly one canonical JSON file. No CSV/Markdown/multi-file export variants are required in Commercial V1.
5. Official exchange notices remain the only live AI-relevant unstructured information class in V1. Generic crypto news, social sentiment, KOL content, and directional news analysis remain out of scope.
6. AI notice extraction produces structured candidate facts; only validated canonical event facts may change runtime eligibility, risk, or calculations.
7. Users may export canonical facts and analyze them externally with ChatGPT, WorkBuddy, another AI system, or their own tooling without coupling trading truth to an internal AI provider.

### No scope expansion

- no new strategy;
- no new venue;
- no crawler dependency in the trading critical path;
- no chat workspace;
- no natural-language filters;
- no AI-generated orders;
- no AI override of deterministic facts.
