# Risk Rules

## Risk dimensions

- market/basis risk;
- funding reversal/persistence risk;
- execution/leg risk;
- liquidity/exit risk;
- venue/counterparty risk;
- stablecoin/settlement asset risk;
- margin/liquidation risk;
- concentration/correlation risk;
- API/data freshness risk;
- operational/system risk.

## Hard execution blocks

Live execution MUST be blocked when any applies:

- required market input stale beyond strategy limit;
- private account state stale;
- fee or instrument metadata unavailable beyond fallback policy;
- capacity below order notional;
- projected portfolio limit breach;
- venue connection degraded beyond execution policy;
- global/venue/strategy kill switch active;
- existing conflicting execution lock;
- account balance/margin insufficient;
- instrument trading state not active;
- API key permission fails policy.

## Market-neutral does not mean risk-free

Every neutral strategy retains venue, execution, basis, liquidity and operational tail risks. UI and AI must not describe a strategy as guaranteed or risk-free.

## Drawdown controls

Owner policy supports:

- max daily realized loss;
- max rolling 7-day loss;
- max portfolio drawdown from high-water mark;
- max per-strategy loss;
- max venue exposure;
- max asset/stablecoin exposure.

Breach disables new AUTO entries. Existing positions are handled according to explicit exit policy rather than blindly liquidated.
