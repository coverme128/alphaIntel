# Cost Attribution v1.0.2

Alpha Proof must charge the strategy for costs that would not exist without the system.

## Trading/economic costs

- maker/taker fees actually charged;
- realized slippage versus canonical pre-trade executable price;
- funding paid and received;
- borrow/interest cost;
- transfer/rebalance/network cost where used;
- forced/emergency hedge loss;
- settlement/conversion cost;
- explicit platform/product fees.

## Product run cost

Track separately, then subtract for `economicValueUsd`:
- server/database/streaming infrastructure;
- paid market-data/API subscriptions;
- AI usage used by the product (even though it is not in trading truth);
- monitoring/alerting services;
- other directly attributable software services.

Developer labor and owner time are not part of trading P&L. They may be supplied as optional `ownerOpportunityCostUsd` for a personal build-vs-value report but cannot alter canonical trading performance.

## Missing cost behavior

Unknown mandatory cost => affected opportunity/cycle is not eligible for Alpha Proof. Do not silently impute zero.
