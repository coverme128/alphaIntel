# Stop / Go Rules v1.0.2

The system distinguishes `can trade`, `has alpha evidence`, and `is worth expanding`.

## GO — keep current scope

Continue the current V1 scope when:
- economic status is at least `LIVE_POSITIVE`;
- realized net P&L and excess return remain positive;
- risk limits hold;
- no critical execution issue is open.

## EXPANSION_WORTHY

Do not add Structured Products, Options, Maker or Event Alpha solely because the software is finished. Expansion is justified only when all are true:
- `ALPHA_VALIDATED`;
- >= 120 live days, with 180 preferred;
- annualized excess return >= 5 percentage points by default;
- `valueToRunCostRatio >= 3.0`;
- `economicValueUsd >= ownerConfiguredMinAnnualEconomicValueUsd` on annualized basis;
- existing V1 profits are not dominated by one trade or one venue;
- capacity headroom indicates more capital or adjacent strategies could add value.

The owner MUST configure `ownerConfiguredMinAnnualEconomicValueUsd`; there is no universal dollar threshold.

## DO_NOT_EXPAND

Set when the engine is operational but, after sufficient live evidence:
- excess return is <= 0; or
- annualized excess return is below the owner's expansion threshold; or
- economic value does not cover product run cost by the required ratio; or
- alpha is too concentrated/fragile to justify additional engineering.

The owner may keep the system for monitoring/risk control, but strategy expansion is stopped.

## STOP_TRADING / INVALIDATED

Disable new AUTO entries when:
- trailing live realized net P&L crosses the configured loss gate;
- benchmark-adjusted evidence turns negative for the configured review window;
- execution-failure loss breaches its cap;
- critical data/connector semantics are unknown;
- safety/risk state is blocked.

Open positions follow deterministic risk/exit policy; STOP_TRADING does not blindly abandon them.
