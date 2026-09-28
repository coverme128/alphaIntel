# MASTER CONTRACT — Alpha Opportunity & Capital OS Commercial V1.0.7

## 1. Formal project name

**Alpha Opportunity & Capital OS**  
Version: **Commercial V1.0.7**

## 2. Product positioning

A deterministic crypto-market opportunity and capital operating system that continuously turns exchange data into:

`Market Facts → Executable Opportunity → Risk/Cost/Capacity → Capital Decision → Action Plan → Execution → Realized P&L`

The product is designed first for an owner operating personal capital, while preserving clean future boundaries for a multi-user commercial service.

## 3. Commercial V1 objective

Commercial V1 is complete when a user can:

1. connect supported venues with read-only credentials;
2. observe normalized market/funding/order-book data;
3. receive qualified opportunities produced by deterministic rules;
4. inspect net expected return, capacity, risk, entry and exit conditions;
5. replay opportunities in paper mode;
6. connect trade-enabled credentials with withdrawal permission disabled;
7. execute in ASSISTED mode with explicit confirmation;
8. optionally enable tightly constrained AUTO mode;
9. monitor paired/multi-leg execution and positions;
10. exit automatically or manually under canonical safety rules;
11. reconcile expected versus realized P&L;
12. stop all new trading through a global kill switch.

## 4. Layer responsibilities

### Product layer — `01-product`
Owns user jobs, product surfaces, workflows, deployment profiles, terminology and UX acceptance.

### Domain layer — `02-domain-rules`
Owns strategy truth, opportunity eligibility, cost/risk/capacity rules, execution rules, portfolio allocation rules and AI boundaries.

### Implementation layer — `03-implementation`
Owns service boundaries, data models, APIs, venue adapters, persistence, security, streaming, tests and Codex implementation sequence.

### Production layer — `04-production-handoff`
Owns deployment, secrets, monitoring, operational runbooks, launch gates, incidents and production acceptance.

## 5. Precedence

When documents conflict:

1. `MASTER-CONTRACT.md`
2. Domain rules
3. Product specification
4. Implementation documents
5. Production handoff examples/configuration

No implementation may weaken a domain safety rule for UX convenience.

## 6. Frozen items

The following are FROZEN for V1.0 unless a correction pack explicitly changes them:

- `System owns Opportunity Truth. AI owns Interpretation.`
- initial four venues: OKX, Binance, Bybit, Hyperliquid;
- launch Carry/Yield strategy families defined in README;
- no crawler dependency in the critical trading path;
- no LLM in opportunity eligibility, return calculation, order sizing, risk-limit enforcement, kill switch or exit enforcement;
- modes: PAPER, ASSISTED, AUTO;
- withdrawal permission is prohibited for CEX API credentials;
- every opportunity has `expected`, `known/locked`, and `variable` return components where applicable;
- all returns shown to users are net-of-modeled-cost and carry an uncertainty/assumption record;
- no “guaranteed profit”, “risk free”, or equivalent product language;
- AUTO requires explicit policy configuration and cannot infer limits from prose at runtime;
- all multi-leg strategies require leg synchronization protection;
- all live trading events are immutable/auditable.

## 7. Mutable items

- exact UI layout and visual system, provided the unified Today/For You/Portfolio/Execution/Performance information hierarchy is preserved;
- technical libraries that preserve contracts;
- database/queue implementation details;
- polling intervals within venue rate limits;
- opportunity thresholds through versioned Strategy Registry configuration;
- AI provider/model;
- deployment provider;
- future exchange adapters.

## 8. Scope excluded from launch gate

The following are built-in module contracts but do not block V1.0 live launch:

- Structured Products module (Dual Investment / Structured Yield / Covered Call / Cash-Secured Put): CONTRACT_READY, execution disabled by default;
- Options / Volatility module: CONTRACT_READY, execution disabled by default;
- market making;
- listing/event alpha;
- public subscriptions/billing;
- organization/workspace/seat management;
- broker rebates;
- discretionary asset management;
- social/copy trading.

## 9. Codex implementation order

Codex MUST implement in this order:

1. canonical schemas, Calculation/Facts contracts and database migrations;
2. shared deterministic formula library + v1.0.4 Golden Fixtures;
3. read-only venue adapters;
4. instrument/market normalization and freshness model;
5. cost/slippage/capacity/margin/risk calculators;
6. strategy registry and opportunity engine;
7. historical replay / paper execution;
8. portfolio/risk policy and Capital Rotation Core;
9. private trade adapters and execution state machine;
10. assisted execution;
11. kill switch, failure recovery and reconciliation;
12. constrained auto execution;
13. unified Opportunity Feed + Capital Action Plan view models;
14. AI explanation over canonical analysis facts;
15. UI hardening;
16. production gates.

Do not begin live execution before calculation closure, PAPER and ASSISTED gates pass.

## 10. Correction packs

A correction that changes formulas, field semantics, execution states or risk behavior MUST ship as a versioned correction pack containing:

- affected contract IDs;
- old behavior;
- new behavior;
- migration impact;
- replay impact;
- test vectors;
- production rollout/rollback instructions.

Threshold tuning that does not change semantics may ship as a versioned Strategy Registry configuration update.

## 11. Commercial launch gate

Launch requires ALL of:

- all four venue market-data adapters pass contract tests;
- at least two venues pass live/private order tests in testnet or equivalent sandbox where available;
- 30-day historical replay completes with reproducible outputs;
- paper mode runs continuously for at least 7 days without unreconciled state;
- assisted mode demonstrates partial-fill, rejection, timeout and one-leg failure recovery;
- global and per-strategy kill switches verified;
- credential encryption and log-redaction verified;
- withdrawal permission absent from documented credential setup;
- expected-vs-realized P&L reconciliation passes test cases;
- no Critical/High open security defects;
- production monitoring and incident runbooks installed.

The gate certifies software readiness, not profitability.


## v1.0.1 Domain Rules Freeze

Commercial v1.0.1 adds the normative `02-domain-rules/strategy-contracts`, `shared-rules`, `config`, and `golden` layers. Codex MUST implement them before strategy promotion. All delivered strategy versions begin as `DRAFT`; no profitability or live-readiness status is pre-asserted.

**Implementation rule:** business formulas and safety semantics may not be invented in code. Any required change must be issued as a versioned Correction Pack.


## v1.0.2 Economic Truth / Alpha Proof Freeze

Commercial v1.0.2 adds a mandatory separation between software readiness and economic validity.

- all strategies/portfolio begin `economic_status = UNPROVEN`;
- positive expected P&L is not Alpha Proof;
- positive realized P&L is insufficient unless benchmark-adjusted value is also positive;
- the primary personal-use success metric is reconciled `economicValueUsd` and benchmark-adjusted excess return under the owner risk budget;
- strategy expansion is not authorized by feature readiness. It requires `ALPHA_VALIDATED` plus `EXPANSION_WORTHY` economics;
- lack of sufficient historical synchronized data must be reported as `EVIDENCE_INSUFFICIENT`, never replaced with favorable assumptions;
- AI cannot create, promote, or override economic evidence status.

The normative contract is `02-domain-rules/economic-validation/`.


## v1.0.3 One Product / Multiple Alpha Modules / One Portfolio Brain Freeze

Commercial v1.0.3 freezes the product-level architecture before first Codex implementation.

- The product remains one product: **Alpha Opportunity & Capital OS**. Strategy families are modules, not separate products.
- Launch modules are `CARRY` and `YIELD`; built-in future modules are `STRUCTURED` and `OPTIONS`.
- Capital Rotation is a **Commercial V1 Core capability**, not a future expansion. It compares eligible opportunities, current positions, idle capital and cash reserve under one deterministic portfolio policy.
- Structured and Options modules ship as `CONTRACT_READY / EXECUTION_DISABLED / ALLOCATION_DISABLED` until their own formula, replay, paper and live promotion gates are delivered and passed.
- A module being visible in navigation does not make it live-eligible. Runtime eligibility is governed by the Module Registry and strategy promotion state.
- Users are not required to browse modules to find trades. All enabled/eligible modules publish into one canonical Opportunity Feed, which produces a ranked **Capital Action Plan**.
- User execution modes remain `GUIDED`, `ASSISTED`, and `AUTO` at the product UX layer, mapping to deterministic PAPER/ASSISTED/AUTO execution capabilities.
- Capital Rotation modes are `OFF`, `ADVISORY`, and `AUTO_REBALANCE`. `AUTO_REBALANCE` is unavailable until the relevant strategies and portfolio policy pass AUTO gates.
- The primary user outputs are: `Today Allocation`, `Top Opportunities`, `Capital Action Plan`, `Position/Exit`, and `Performance/Alpha`.
- Opportunity modules may be disabled independently without disabling the shared Portfolio, Risk, Execution or P&L core.

Normative v1.0.3 documents are `01-product/*v1.0.3*`, `02-domain-rules/*v1.0.3*`, `02-domain-rules/config/*v1.0.3*`, and the corresponding schemas/implementation/handoff addenda.


## v1.0.4 Calculation & Facts Closure Freeze

Before first Codex implementation, Commercial v1.0.4 closes the numeric truth path:

`Canonical Data → Deterministic Calculation → CanonicalCalculationFacts → OpportunityAnalysisFacts → User / AI`.

Frozen corrections/additions:

- risk N/A dimensions are excluded from both weighted numerator and denominator;
- cost and reserve are separate semantic objects;
- multi-leg sizing uses canonical instrument/exposure normalization after venue rounding;
- derivative live eligibility requires margin/liquidation evidence and stress-buffer gates;
- opportunity economics are size-aware and the allocator uses marginal economics;
- holding-period return is canonical; annualized equivalents are comparison-only;
- portfolio expected output distinguishes mixed-horizon plan P&L from normalized capital-day comparisons;
- NAV/P&L use canonical valuation and never assume stablecoin peg equality;
- Alpha Proof TWR follows `TWR-CONTRACT-v1.0.4.md`;
- every user/AI decision number must be traceable to formula/version/input snapshot/config;
- AI explanations consume canonical facts and cannot recompute trading truth.

Normative v1.0.4 artifacts supersede prior calculation artifacts where they conflict. This is the final pre-Codex calculation baseline; further changes require an explicit correction pack.

## v1.0.5 Product Value & Survival Gate Freeze

Commercial v1.0.5 adds no new trading strategy. It freezes the final personal-use value decision layer.

- Personal-use primary success remains benchmark-adjusted **Realized Excess Alpha** after reconciled costs.
- Product value is a vector: `Alpha Value`, `Risk Reduction Value`, `Operational Efficiency Value`, and `Product Run Cost`. Unlike units MUST NOT be added into an arbitrary score.
- `ALPHA_PRODUCT_SUCCESS` requires the existing `ALPHA_VALIDATED` gate; v1.0.5 does not weaken Alpha Proof.
- If Alpha is not validated, material drawdown reduction with comparable return may classify the system as `RISK_CAPITAL_OS_VALUE`.
- If neither Alpha nor material risk reduction exists, material measured/owner-logged workload reduction may classify it as `AUTOMATION_VALUE_ONLY`.
- Risk/automation value can justify `KEEP_REDUCED_SCOPE` but cannot authorize strategy expansion.
- Expansion continues to require the existing `EXPANSION_WORTHY` economic gate.
- After sufficient live evidence, absence of Alpha, risk and operational value produces `NO_MATERIAL_VALUE`; after the stricter 120-day evidence floor it may produce `STOP_PRODUCT`.
- `CROSS_EXCHANGE_SPREAD` is retained as an `OPPORTUNISTIC` dislocation detector, not the core Alpha thesis and not a reason to build V1 high-frequency infrastructure.
- Core V1 Alpha thesis is Funding, Cross-Exchange Funding, Basis/Carry, Yield and Capital Rotation. Structured/Options remain contract-ready and disabled.

Normative v1.0.5 artifacts are under `02-domain-rules/product-value/` plus `02-domain-rules/config/alpha-thesis-priority.v1.0.5.yaml`. v1.0.4 remains authoritative for calculation truth where v1.0.5 does not explicitly change product-value semantics.


## v1.0.6 Personal UX & Action Experience Closure Freeze

Commercial v1.0.6 closes the PRIVATE owner experience without changing trading truth.

- **Complexity belongs to the system; convenience belongs to the user.** Internal strategy, risk, readiness, trace and governance states remain available but are progressively disclosed rather than exposed as the default workflow.
- Primary owner navigation is frozen to `Today`, `Opportunities`, `Positions`, `Portfolio`, and `Performance`. Replay, Connections, Risk, Modules, AI settings, raw calculation traces and operational diagnostics live under `Advanced / Settings` or contextual drill-down.
- `Today` shows at most three primary capital actions. Canonical user action types are `EXECUTE`, `HOLD`, `ROTATE`, `EXIT`, and `KEEP_CASH`.
- Every primary action uses progressive disclosure: **Action → Why → Calculation Details → Professional Trace**.
- Qualified opportunity, exit, material risk and execution-failure alerts are first-class user delivery events. Alerts never bypass final execution eligibility or confirmation rules.
- Capital Inventory Plan is a read-only planning layer that shows venue-level ready capital, excess capital and shortfall for eligible actions. It MUST NOT request or require withdrawal-enabled API credentials and MUST NOT initiate transfers in V1.
- Strategy/economic maturity must be shown in user language on actionable opportunities. A high expected return cannot visually outrank `UNPROVEN` / `PAPER` / `LIVE` / `ALPHA_VALIDATED` maturity evidence.
- User risk presentation prioritizes monetary consequences (`capitalAtRiskUsd`, modeled stress loss, estimated emergency-exit cost and liquidation distance when applicable) before internal composite risk scores.
- AI is contextual explanation-on-demand. The product must remain fully decision-usable when AI is unavailable.
- Structured/Options remain research-only and hidden from default owner navigation until owner opt-in and module readiness allow visibility. Visibility never grants allocation or execution eligibility.

Normative v1.0.6 artifacts are under `01-product/*v1.0.6*`, `03-implementation/*v1.0.6*`, `02-domain-rules/schemas/*v1.0.6*`, and `04-production-handoff/*v1.0.6*`.


## v1.0.7 AI Optional / Single Export Freeze

Commercial v1.0.7 changes no strategy economics or safety gate. It freezes the separation between deterministic trading truth and optional AI interpretation.

- Supported intelligence modes are `CORE_ONLY` and `AI_ENHANCED`. `CORE_ONLY` is a complete production mode.
- No opportunity, capital, execution, exit, P&L, Alpha Proof, Product Value, alert, or export workflow may depend on an AI provider.
- Natural-language opportunity/portfolio query is removed from Commercial V1.
- The product exposes exactly one analysis export: **Decision & Analysis Export**, producing one canonical JSON file under `decision-analysis-export.v1.0.7.schema.json`. No format selector is required.
- The export contains canonical facts/decisions/traces and MUST NOT re-run trading formulas or contain secrets.
- AI-enhanced live unstructured processing is restricted to approved official exchange notices. AI extraction produces only candidate event facts until deterministic validation/review promotes them to canonical event facts.
- Generic news, social sentiment, KOL analysis and directional prediction remain out of scope.

Normative v1.0.7 artifacts are `01-product/AI-MODES-AND-EXPORT-v1.0.7.md`, `01-product/OFFICIAL-NOTICE-SCOPE-v1.0.7.md`, `02-domain-rules/AI-CONTRACT.md`, `02-domain-rules/DECISION-ANALYSIS-EXPORT-CONTRACT-v1.0.7.md`, the v1.0.7 schemas, implementation addendum and production acceptance checklist.
