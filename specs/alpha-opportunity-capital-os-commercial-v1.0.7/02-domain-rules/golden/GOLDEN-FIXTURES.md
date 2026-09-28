# Golden Fixtures v1.0.4

`golden-fixtures.v1.0.4.json` is normative for calculation closure. v1.0.1 fixture values remain historical but v1.0.4 supersedes the required test set.

## Minimum strategy classes

Every launch strategy has explicit fixtures for:

- positive qualification;
- cost erases edge;
- stale input;
- insufficient capacity;
- hard risk block;
- exit trigger.

That is at least 30 launch-strategy class fixtures.

## Shared rule fixtures

The file also includes deterministic fixtures for:

- applicable-weight risk normalization;
- margin stress and hard block;
- linear/inverse instrument normalization;
- size-aware marginal economics;
- portfolio expected return normalization;
- stablecoin valuation without peg assumption;
- TWR with and without external flow;
- cost/reserve separation.

Codex may add venue-adapter and state-machine fixtures but MUST NOT change normative expected outputs merely to make tests pass.

Golden consistency proves implementation semantics only, not profitability.
