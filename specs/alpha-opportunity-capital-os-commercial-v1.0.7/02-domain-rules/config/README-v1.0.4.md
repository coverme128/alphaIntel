# Config precedence v1.0.4

For first Codex handoff use:

- `strategy-registry.v1.0.4.yaml`
- `formula-contracts.v1.0.4.json`
- `risk-policy.v1.0.4.yaml`
- `allocation-policy.v1.0.1.yaml` plus the v1.0.4 allocator contract
- `capital-rotation-policy.v1.0.3.yaml`
- `calculation-policy.v1.0.4.yaml`
- `valuation-policy.v1.0.4.yaml`
- venue / settlement-asset / correlation registries v1.0.4

Older formula/risk/strategy registry files are retained only for changelog/history and MUST NOT be loaded by new runtime code where a v1.0.4 equivalent exists.
