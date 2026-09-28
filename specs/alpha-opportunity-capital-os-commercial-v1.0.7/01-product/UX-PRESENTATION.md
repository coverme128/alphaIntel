# Product Presentation & Experience Orchestration

## v1.0.3 primary hierarchy

The default user experience is `Today Allocation → Primary Actions → Opportunity Detail → Execute/Monitor → Performance`. Module browsing is secondary.

## Information priority

The product MUST rank information in this order:

1. Can this be executed now?
2. What is expected net return after modeled costs?
3. What is the capital capacity?
4. What is the risk / worst modeled scenario?
5. What exact actions are required?
6. What invalidates the opportunity?
7. Why does the opportunity exist?
8. Raw market details.

## Opportunity card

Required fields:

- strategy family + symbol;
- venue(s);
- status: CANDIDATE / QUALIFIED / STALE / BLOCKED;
- expected net return for the expected holding period;
- annualized equivalent only as secondary context;
- capacity at configured slippage tolerance;
- risk level and top risk flag;
- expected duration/window;
- data freshness;
- CTA: Inspect / Paper / Build Plan.

APR MUST never be the primary return number for a short-duration opportunity.

## Opportunity detail

Sections:

`WHAT → RETURN → COST → CAPACITY → RISK → ACTION → ENTRY → EXIT → LIVE → EVIDENCE`

“Evidence” means machine facts and formula inputs, not AI prose.

## Action plan presentation

Each leg shows:

- venue/account;
- instrument;
- side;
- order type;
- quantity/notional;
- limit or guard price;
- sequencing rule;
- hedge ratio;
- timeout;
- failure action.

## AI presentation

AI text must cite canonical fact labels in-product and must never replace the numeric facts panel. If AI is unavailable, all product functions remain usable.

## Empty states

- No opportunity: “No opportunity currently meets your thresholds.” Never fabricate alternatives.
- Data stale: show venue/input causing staleness and disable live execution.
- Insufficient capital: show required minimum and capacity logic.
- Permission missing: identify exact venue permission needed.
- Risk blocked: show policy that blocked execution.


## Capital Action Plan presentation

Show current→target allocation, exact move, notional, expected incremental benefit after switching costs, risk change, validity window and execution CTA. Do not require the user to compare module pages manually.

## v1.0.6 personal simplicity override

For PRIVATE owner use, the default navigation and card hierarchy follow `PERSONAL-UX-CLOSURE-v1.0.6.md`. Internal states and technical facts remain accessible through progressive disclosure. No new first-level navigation may be added without a later product correction.
