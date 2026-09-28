# Return, Cost and Capacity Rules

## General return decomposition

Every opportunity MUST expose:

`gross_return = known_return + variable_expected_return`

`expected_net_return = gross_return - trading_fees - expected_slippage - borrow_cost - transfer_or_rebalance_cost - product_specific_costs`

Where relevant, also expose:

- `locked_or_known_return`
- `variable_return`
- `annualized_equivalent`
- `expected_holding_seconds`
- `return_assumptions[]`

Annualization is secondary display only.

## Funding strategy

Expected funding income must account for:

- current funding rate;
- funding interval;
- next settlement time;
- expected number of settlements;
- historical/predicted persistence model;
- notional actually hedged.

A displayed current funding rate alone is never sufficient for qualification.

## Basis strategy

Basis return uses executable spot ask and future bid for entry, executable reverse sides for modeled exit, expiry/settlement rules, fees and capital/borrow costs.

## Cross-exchange spread

Gross spread is based on executable weighted prices at intended size, not last-traded price.

## Slippage

Capacity is derived from book walking up to configured maximum slippage. A strategy may be profitable at $1,000 and unprofitable at $100,000; capacity is therefore a first-class output.

## Cost freshness

Fees, borrow rates and venue-specific schedules are versioned facts. If user-specific fee tier cannot be obtained, the system uses a conservative configured tier and labels the assumption.
