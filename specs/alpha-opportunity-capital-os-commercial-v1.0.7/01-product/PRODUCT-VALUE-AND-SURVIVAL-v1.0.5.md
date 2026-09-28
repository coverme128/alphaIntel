# Product Value & Survival — v1.0.5

## Product question

For the PRIVATE / owner-only launch profile, the product exists primarily to improve the owner's capital outcome. Feature completeness, opportunity count and headline APR are not success criteria.

The product must answer four separate questions:

1. **Alpha:** Did it generate benchmark-adjusted excess return after all trading and product run costs?
2. **Risk:** If return was similar, did it materially reduce drawdown / tail exposure / concentration under the same owner risk budget?
3. **Operations:** If return and risk were similar, did it materially reduce manual monitoring and execution workload?
4. **Survival:** Based on sufficient live evidence, should the product expand, remain in reduced scope, or stop?

## Value hierarchy

Priority is frozen as:

`P1 Excess Alpha > P2 Risk Reduction > P3 Operational Efficiency`.

Risk or automation value may justify retaining the system, but must not be presented as proof of trading Alpha.

## Value vector

Product value is reported as a vector:

- `alphaValue`
- `riskReductionValue`
- `operationalEfficiencyValue`
- `productRunCost`

Do not add percentages, hours and dollars into a single score.

Optional monetization is allowed only after the owner explicitly configures:

- `ownerTimeValueUsdPerHour`; and/or
- an approved risk-value coefficient.

AI must not invent these coefficients.

## User-facing decision

Performance must expose:

- portfolio return;
- benchmark return;
- excess return;
- economic value USD;
- max drawdown for system and benchmark where comparable;
- drawdown reduction;
- manual hours baseline and actual;
- time saved;
- product run cost;
- `valueClassification`;
- `expansionDecision`;
- `survivalDecision`.

The system must be willing to state `STOP_PRODUCT` when the evidence warrants it.
