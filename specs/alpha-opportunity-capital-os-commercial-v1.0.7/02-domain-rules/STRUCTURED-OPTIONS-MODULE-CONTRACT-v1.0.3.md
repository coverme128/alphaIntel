# Structured Products & Options Built-in Module Contract v1.0.3

These modules belong to the same product architecture now, but are not authorized for V1 live trading.

## STRUCTURED module scope

Planned strategy adapters:

- Dual Investment / Buy Low / Sell High;
- Covered Call equivalents;
- Cash-Secured Put equivalents;
- future exchange-native structured yield products that can be modeled deterministically.

Required future outputs before promotion:

- actual holding-period yield;
- strike/target distance;
- settlement asset and conversion rule;
- modeled conversion probability;
- expected value under versioned assumptions;
- scenario/tail-loss table;
- capital lock and early-exit constraints;
- comparable risk/capital-day utility.

## OPTIONS module scope

Planned opportunity families:

- implied-volatility relative value;
- term-structure spreads;
- skew-relative value;
- delta-hedged volatility premium structures.

Required future outputs:

- instrument legs and Greeks;
- IV inputs and source timestamps;
- expected carry/theta/hedge cost;
- scenario P&L and max modeled loss;
- margin/collateral requirement;
- liquidity/capacity;
- explicit hedge and exit rules.

## V1 state

Both modules MUST remain:

`implementationStatus = CONTRACT_READY`
`economicStatus = UNPROVEN`
`executionCeiling = DISABLED`
`allocationEligibility = DISABLED`

They may appear in product navigation as `Research only`, but must not enter Capital Action Plans until a later version provides complete strategy contracts, fixtures, replay evidence and promotion gates.
