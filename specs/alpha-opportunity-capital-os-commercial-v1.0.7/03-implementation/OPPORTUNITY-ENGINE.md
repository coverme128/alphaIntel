# Opportunity Engine Implementation

## Pipeline

1. receive normalized events;
2. update in-memory/latest market state;
3. trigger strategy evaluators on relevant changes or cadence;
4. verify required input freshness;
5. compute executable prices at candidate size bands;
6. compute gross return;
7. compute fees/slippage/other costs;
8. compute capacity;
9. compute risk flags;
10. evaluate qualification thresholds;
11. persist candidate/qualified snapshot with input hash;
12. publish opportunity event.

## Size bands

Do not evaluate only one hard-coded capital amount. V1 should compute at representative bands, e.g. 1k/5k/10k/25k/50k/100k USD where market depth allows, then interpolate conservatively.

## Determinism

Given the same strategy version and same canonical inputs, the engine MUST produce the same output. Store formula/config version and input hash.

## Replay

Replay feeds historical/saved canonical events into the exact same evaluator. Do not maintain a separate “backtest formula” implementation.
