# Alpha Opportunity & Capital OS — Commercial V1.0.7

**Release type:** Commercial-grade, Codex-ready implementation bundle  
**Primary launch profile:** PRIVATE / owner-only  
**Future profile:** PUBLIC / multi-user, without changing the core opportunity truth model  
**Product principle:** System owns Opportunity Truth. AI is optional interpretation/extraction.

This release is not an “AI trading bot” and is not a price-prediction product. It is a deterministic opportunity, capital-allocation and execution operating system for crypto markets.

## Commercial V1 live strategy scope

1. Funding Neutral — spot/perpetual delta-neutral funding capture.
2. Basis / Cash-and-Carry — spot versus dated futures basis capture.
3. Cross-Exchange Funding — delta-neutral funding differential across venues.
4. Cross-Exchange Price Spread — executable bid/ask dislocation across venues.
5. Stablecoin / Idle-Capital Yield — compare eligible yield venues after costs and liquidity constraints.

**Initial venue adapters:** OKX, Binance, Bybit, Hyperliquid.

Structured Products and Options/Volatility are built-in module contracts in v1.0.3 but remain execution/allocation disabled until independently validated. Market-making and event alpha remain later expansion boundaries.

## Release structure

```text
alpha-opportunity-capital-os-commercial-v1.0.7/
├── MASTER-CONTRACT.md
├── README.md
├── 01-product/
├── 02-domain-rules/
├── 03-implementation/
└── 04-production-handoff/
```

## Implementation philosophy

Commercial-grade does **not** mean building every future feature now. It means:

- real-money safety is production-grade from day one;
- opportunity calculations are deterministic and replayable;
- every order is traceable back to an opportunity and policy decision;
- paper, assisted and auto modes share one execution path;
- AI failure never blocks market calculation, risk controls or emergency exits;
- multi-user SaaS concerns remain outside the PRIVATE launch critical path.


## v1.0.1 completion

This release includes formal strategy contracts, cost/capacity/risk/allocation formulas, per-strategy execution fallbacks, P&L accounting, machine-readable configs, Golden Fixtures and promotion gates. Start implementation from the domain-rule freeze before enabling any live mode.


## v1.0.2 Economic Validation

V1.0.2 does not add strategies. It adds the Alpha Proof layer required for personal-capital value validation:

`Reconciled Realized P&L → Shadow Benchmark → Excess Return → Run Cost → Economic Value → Stop/Go/Expand`

Until live gates pass, economic status remains `UNPROVEN` even when the software is production-ready.


## v1.0.3 Product Architecture

**Frozen principle:** `One Product, Multiple Alpha Modules, One Portfolio Brain.`

```text
Opportunity Modules
  ├─ Carry: Funding / Basis / Cross-exchange Funding / Spread
  ├─ Yield: Idle-capital / Stablecoin Yield
  ├─ Structured: contract-ready, disabled for live V1
  └─ Options: contract-ready, disabled for live V1
            ↓
Unified Opportunity Contract
            ↓
Capital Rotation / Portfolio Engine
            ↓
Capital Action Plan
            ↓
Guided / Assisted / Auto Execution
            ↓
Realized P&L + Alpha Proof
```

Capital Rotation is part of the V1 core. Users consume one `For You` opportunity feed and one portfolio recommendation rather than manually comparing each strategy module.


## v1.0.4 Calculation & Facts Closure

V1.0.4 adds no new Alpha strategy. It makes every decision-relevant calculation a canonical, reproducible fact that can be used consistently by Opportunity, Capital Rotation, P&L, the user UI and AI explanation.

Key chain:

`Market/Account Facts → Formula v1.0.4 → Calculation Facts/Trace → Opportunity Analysis Facts → User/AI`

The release also closes instrument normalization, derivative margin/liquidation, size-dependent economics, cost/reserve separation, portfolio expected-return semantics, canonical USD valuation, formal TWR and expanded Golden Fixtures.

## v1.0.5 Product Value & Survival Gate

V1.0.5 adds no strategy. It makes the system explicitly decide whether it is worth keeping:

`Alpha Proof → Risk Comparison → Workload Comparison → Value Classification → Expansion Decision → Survival Decision`

Possible value classes are `ALPHA_PRODUCT_SUCCESS`, `RISK_CAPITAL_OS_VALUE`, `AUTOMATION_VALUE_ONLY`, `NO_MATERIAL_VALUE`, or `EVIDENCE_INSUFFICIENT`.

Cross-exchange price spread remains implemented as an opportunistic dislocation capability; the core thesis is risk-premium allocation across Funding, Cross-Exchange Funding, Basis, Yield and Capital Rotation.


## v1.0.6 Personal UX & Action Experience

V1.0.6 is a presentation and usability closure. It does not add Alpha engines or change calculations.

Default owner loop:

`Open Today → Review 1–3 actions → Understand return/risk/maturity → Confirm or Hold → System monitors → Receive exit/risk alert → Review realized value`

Primary navigation is limited to `Today / Opportunities / Positions / Portfolio / Performance`. Advanced controls and engineering detail remain available through progressive disclosure and Settings.


## v1.0.7 AI Optional + Single Decision & Analysis Export

V1.0.7 changes no trading economics. It freezes two runtime modes: `CORE_ONLY` and `AI_ENHANCED`. The complete opportunity/capital/execution/P&L workflow must work in `CORE_ONLY`. Natural-language opportunity/portfolio query is removed from V1.

The product exposes exactly one portable analysis export: **Decision & Analysis Export**, producing one schema-versioned JSON file containing canonical portfolio, action, opportunity, position, performance, risk, calculation/trace and Product Value facts. It is provider-neutral and can be analyzed by ChatGPT, WorkBuddy or other tools without coupling external AI output back into trading truth.

AI-enhanced live use is restricted primarily to official exchange notice extraction and optional explanation/performance commentary. Generic news/sentiment analysis remains outside V1.
