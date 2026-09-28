# Product Value Contract v1.0.5

## Contract ID

`PRODUCT_VALUE_CONTRACT_V1_0_5`

## Principle

Product success and trading Alpha are related but not identical. The runtime MUST preserve separate fields for Alpha, risk reduction and operational efficiency.

## Canonical outputs

### Alpha value

Use existing Alpha Proof facts:

- `portfolioTwrPct`
- `benchmarkTwrPct`
- `excessTwrPct`
- `annualizedExcessTwrPct` when evidence duration allows annualization
- `economicValueUsd`
- `productRunCostUsd`

`economicValueUsd` remains the benchmark-adjusted monetary economic result defined by Alpha Proof. Do not redefine it to include time or risk value.

### Risk reduction value

For a comparable evaluation window:

`absoluteDrawdownImprovementPctPoints = abs(benchmarkMaxDrawdownPct) - abs(systemMaxDrawdownPct)`

`relativeDrawdownReductionPct = absoluteDrawdownImprovementPctPoints / abs(benchmarkMaxDrawdownPct) * 100`

When `benchmarkMaxDrawdownPct == 0`, relative reduction is `null`; never divide by zero.

Risk-value classification also requires:

- no breach of owner hard risk policy;
- no Severity-1 execution incident;
- return sacrifice within configured tolerance.

### Operational efficiency value

`manualHoursSaved = max(0, baselineManualHours - actualManualHours)`

`manualTimeReductionPct = manualHoursSaved / baselineManualHours * 100`

When `baselineManualHours == 0`, reduction is `null`.

Manual-time data source must be explicit:

- `MEASURED`
- `OWNER_LOGGED`
- `ESTIMATED_BASELINE`

Estimated data may support UX diagnostics but cannot alone trigger an irreversible `STOP_PRODUCT` or expansion decision.

## Value classification

One of:

- `EVIDENCE_INSUFFICIENT`
- `ALPHA_PRODUCT_SUCCESS`
- `RISK_CAPITAL_OS_VALUE`
- `AUTOMATION_VALUE_ONLY`
- `NO_MATERIAL_VALUE`

Value classification does not itself authorize strategy expansion.

## Separate decisions

The engine MUST additionally emit:

- `expansionDecision`: `NOT_EVALUATED | EXPANSION_WORTHY | DO_NOT_EXPAND`
- `survivalDecision`: `EVIDENCE_INSUFFICIENT | CONTINUE | KEEP_REDUCED_SCOPE | STOP_PRODUCT`

This separation prevents "useful as a risk tool" from being confused with "worthy of adding more Alpha strategies".
