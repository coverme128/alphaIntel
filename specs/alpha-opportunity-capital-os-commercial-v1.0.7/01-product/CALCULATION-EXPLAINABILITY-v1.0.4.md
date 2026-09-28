# Calculation Explainability UX v1.0.4

Users should see a concise decision first and a calculation breakdown on demand.

## Opportunity card

Show:
- expected net return for the stated holding horizon;
- recommended amount and max proven capacity;
- risk level;
- expected holding time;
- primary reason code.

## “How calculated” drawer

Example:

- Gross expected funding: +0.28%
- Trading / settlement fees: -0.05%
- Entry + expected exit slippage: -0.02%
- Basis adverse reserve: -0.03% (reserve, not paid fee)
- Model reserve: -0.01% (reserve)
- Expected net: +0.17%

Also show formula version/data time in advanced details.

## Size effect

When return changes materially by size, show a small table/curve such as 5K / 10K / 25K rather than one return for every amount.

## AI

AI uses the same facts shown in this drawer. If facts are missing/stale, AI explains the blocked state instead of supplying a number.
