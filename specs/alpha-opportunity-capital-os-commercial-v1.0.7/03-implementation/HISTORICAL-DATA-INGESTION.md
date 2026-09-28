# Historical Data Ingestion for Alpha Proof

## Principle

Historical validation must reproduce the exact facts required by production evaluators. Missing microstructure data is not replaced with favorable assumptions.

## Required by strategy

### Funding Neutral
- spot executable prices/books;
- perpetual executable prices/books;
- funding history and settlement timestamps;
- fee tier history or conservative configured fee;
- instrument metadata.

### Basis / Cash-and-Carry
- spot executable prices/books;
- dated futures executable prices/books;
- expiry/settlement metadata;
- borrow/capital cost where applicable.

### Cross-Exchange Funding / Spread
- timestamp-aligned venue A and venue B data;
- both fee models and instrument mappings;
- funding settlement schedules for funding strategy;
- both books for executable spread/capacity.

### Idle Capital Yield
- observed rate time series;
- subscription/redemption/lock constraints;
- product eligibility/capacity where known.

## Missing evidence policy

If required synchronized data is unavailable, mark the strategy/period `EVIDENCE_INSUFFICIENT`. Do not backfill with candle close, mid price, or today's fee schedule unless the report explicitly uses a conservative proxy policy and separates the result from strong evidence.

## Replay split

Use chronological calibration/holdout segments. Defaults:
- first 70% calibration/parameter review;
- final 30% holdout;
- final holdout is never used to tune the same strategy version.

This is not intended as an ML research platform; the split exists to reduce threshold overfitting.
