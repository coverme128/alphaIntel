# Test Plan

## 1. Contract tests

Each venue adapter must pass the same canonical tests for instruments, book, funding, balances, positions, orders, error mapping and timestamps.

## 2. Formula golden tests

Maintain deterministic fixtures for every strategy:

- positive opportunity;
- fees erase opportunity;
- slippage erases opportunity;
- insufficient capacity;
- stale funding/book;
- reversed funding;
- differing settlement intervals;
- expiry basis convergence assumptions.

## 3. Property/invariant tests

Examples:

- increasing fees cannot improve expected net return;
- increasing order size cannot increase capacity feasibility under a fixed book;
- an opportunity cannot remain QUALIFIED after required data exceeds freshness limit;
- live notional cannot exceed policy after rounding.

## 4. Replay tests

- same input stream + same strategy hash = same opportunities;
- persisted opportunity can be reproduced from evidence inputs;
- paper P&L attribution balances.

## 5. Execution chaos tests

Inject:

- leg A fills / leg B rejects;
- 30% partial fill then disconnect;
- duplicate acknowledgements;
- out-of-order private events;
- REST timeout with unknown order state;
- venue WebSocket disconnect;
- process restart mid-execution.

## 6. Security tests

- secrets absent from logs/traces;
- API cannot bypass risk policy;
- AI endpoints cannot submit orders;
- withdrawal-capable key is rejected/flagged according to adapter ability.


## v1.0.1 normative fixture requirement

The arithmetic fixtures in `02-domain-rules/golden/golden-fixtures.v1.0.4.json` are immutable acceptance inputs. Add cases; do not modify expected outputs to make tests pass. Promotion tests follow `PROMOTION-GATES.md` and `REPLAY-ACCEPTANCE.md`.


## 7. Economic validation tests (v1.0.2)

- economic golden fixtures pass exactly;
- external cash flow cannot create trading P&L or alpha;
- raising benchmark return cannot improve excess return;
- raising run cost cannot improve economic value;
- positive actual P&L with stronger benchmark can produce negative alpha;
- reports under 30 days cannot show annualized return;
- replay holdout cannot be used to mutate the same strategy/config hash;
- missing mandatory cost blocks Alpha Proof eligibility;
- same ledgers + policy hashes produce same report hash.


## v1.0.4 calculation closure

Golden tests MUST include all 30 launch-strategy fixture classes plus shared risk/margin/instrument/size/portfolio/valuation/TWR fixtures. Add schema tests for OpportunityAnalysisFacts, PortfolioAnalysisFacts and PerformanceAnalysisFacts.
