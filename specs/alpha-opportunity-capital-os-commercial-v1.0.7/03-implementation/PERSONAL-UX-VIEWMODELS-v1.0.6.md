# Personal UX ViewModels — v1.0.6

These are projections over canonical domain facts. They MUST NOT contain a second implementation of opportunity/risk/return calculations.

## OwnerTodayViewModel

```ts
type OwnerTodayViewModel = {
  totalEquityUsd: number;
  deployedCapitalUsd: number;
  readyCapitalUsd: number;
  monthRealizedNetPnlUsd: number;
  benchmarkExcessReturnPct?: number;
  evidenceStatus: string;
  actions: OwnerActionCard[]; // max 3
  positionsNeedingAttention: PositionAttentionItem[];
  inventoryWarnings: CapitalInventoryWarning[];
};
```

## OwnerActionCard

Required projection fields:

- actionType: EXECUTE | HOLD | ROTATE | EXIT | KEEP_CASH;
- opportunity/position reference;
- displayTitle;
- capitalUsd;
- expectedNetPnlUsd / expectedNetPct when applicable;
- expectedHoldingPeriod;
- modeledStressLossUsd when applicable;
- emergencyExitCostUsd when applicable;
- liquidationDistancePct when applicable;
- userRiskLabel;
- evidenceMaturity;
- primaryReasonCode;
- validity/expiresAt;
- executionAvailability;
- primaryCTA.

Action card values MUST reference canonical calculation/analysis facts by ID.

## OpportunityFeedItem

Default view excludes formula/config internals and exposes:

- actionability;
- holding-period net economics;
- recommended size;
- monetary risk summary;
- evidence maturity;
- freshness;
- execution mode.

`Why` endpoint returns deterministic reason-code projection.

`Calculation Details` endpoint returns canonical fact groups.

`Trace` endpoint returns CalculationTrace only on explicit drill-down.

## CapitalInventoryPlanViewModel

Per venue/account:

- available and ready USD value;
- reserved USD;
- target/pre-positioning requirement;
- excess/shortfall;
- reasons blocking ready-capital classification.

The view model must not produce transfer instructions as executable orders.

## AlertEventViewModel

Canonical event types:

- OPPORTUNITY_READY
- EXIT_RECOMMENDED
- RISK_ACTION_REQUIRED
- EXECUTION_FAILURE

Every alert contains a canonical entity version/reference and cannot be reconstructed from AI prose.

## Advanced surfaces

The default router should place the following below Advanced/Settings rather than the first navigation level:

- Connections;
- Replay;
- Strategy/module readiness;
- Risk-policy configuration;
- raw calculation traces;
- operational diagnostics;
- AI/provider configuration;
- Decision & Analysis Export settings/history (if any).
