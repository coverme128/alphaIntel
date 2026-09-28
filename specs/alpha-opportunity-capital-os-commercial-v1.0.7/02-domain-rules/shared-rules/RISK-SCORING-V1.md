# Risk Scoring v1.0.4

Risk is deterministic and separate from expected return. A hard block overrides the numeric score.

## Weighted dimensions

| Dimension | Weight |
|---|---:|
| market / basis | 15 |
| funding persistence / reversal | 15 |
| execution / leg | 20 |
| liquidity / exit | 15 |
| venue / counterparty config | 10 |
| stablecoin / settlement asset config | 5 |
| margin / liquidation | 5 |
| concentration / correlation | 5 |
| data freshness | 5 |
| operational / connector health | 5 |

Each **applicable** dimension returns `0,25,50,75,100`. Non-applicable dimensions are `null/N_A`, not zero.

`riskScore = sum(score_i * weight_i for applicable i) / sum(weight_i for applicable i)`

This v1.0.4 normalization corrects the prior denominator bias that made strategies with many N/A dimensions appear artificially safer.

## Level mapping

- `LOW`: <=20
- `MEDIUM_LOW`: >20 and <=35
- `MEDIUM`: >35 and <=50
- `MEDIUM_HIGH`: >50 and <=70
- `HIGH`: >70
- `BLOCKED`: any hard block, regardless of score.

## Applicability

Applicability is strategy-family/config driven, not inferred by AI. Required defaults are in `risk-policy.v1.0.4.yaml`.

## Deterministic bucket rules

### Data freshness
Use worst `age/TTL` ratio across required inputs:
- <=0.25 → 0
- <=0.50 → 25
- <=0.75 → 50
- <=1.00 → 75
- >1.00 → HARD BLOCK

### Liquidity
`utilization = intendedNotional / maxNotionalUsd`:
- <=0.25 → 0
- <=0.50 → 25
- <=0.75 → 50
- <=0.90 → 75
- >0.90 → 100; >1.00 → HARD BLOCK

### Funding persistence
For funding strategies, use favorable-history ratio over lookback:
- >=0.90 → 0
- >=0.80 → 25
- >=0.67 → 50
- >=0.55 → 75
- <0.55 → 100; strategy entry rejects below its qualification threshold.

### Margin / liquidation
Use `MARGIN-LIQUIDATION-V1.md`; the dimension score is the worst applicable margin bucket. Hard blocks remain hard blocks.

### Concentration
Use highest post-trade exposure/cap ratio across venue, asset, stablecoin and correlation group:
- <=0.50 → 0
- <=0.75 → 25
- <=0.90 → 50
- <=1.00 → 75
- >1.00 → HARD BLOCK

### Venue / stablecoin
These are approved registry facts, never inferred by AI:
- Tier A → 10
- Tier B → 35
- Tier C → 65
- Tier D / UNREVIEWED / UNKNOWN in live mode → HARD BLOCK

### Execution
Before sufficient live evidence exists use 50. After evidence:

`successRate = successfulHedgedExecutions / totalAttemptedExecutions`

- >=99.5% → 0
- >=99.0% → 25
- >=98.0% → 50
- >=95.0% → 75
- <95.0% → 100

Critical leg-synchronization failure state → HARD BLOCK.

### Operational
Use connector health over required venues:
- all healthy, no recovery in last 60m → 0
- transient recovery, fully healthy now → 25
- repeated reconnects / degraded non-critical path → 50
- materially degraded required connector → 75
- critical degraded / state uncertainty → HARD BLOCK

### Market / basis
For carry strategies use `adverseReservePct / max(expectedGrossPct,0.01)`:
- <=0.25 → 0
- <=0.50 → 25
- <=1.00 → 50
- <=2.00 → 75
- >2.00 → 100

### Correlation
Correlation/concentration grouping is provided by `correlation-group-registry.v1.0.4.yaml`; AI cannot create groups at runtime.
