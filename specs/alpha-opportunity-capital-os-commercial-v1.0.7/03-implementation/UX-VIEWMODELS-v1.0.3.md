# UX ViewModels v1.0.3

## TodayViewModel

- total equity / deployed / free cash;
- current allocation by module/strategy;
- target allocation;
- top 1–3 recommended actions;
- active positions requiring attention;
- realized P&L and benchmark/excess-alpha summary;
- economic status.

## OpportunityFeedViewModel

- unified candidates from all visible modules;
- qualified/rejected/stale tabs;
- module, strategy, net return, capacity, risk, holding period, recommended allocation, available execution mode;
- deterministic rejection reason codes.

## CapitalActionPlanViewModel

- current → target move;
- source/target strategy;
- notional;
- expected incremental net benefit;
- switching cost;
- risk impact;
- expiry;
- exact execution CTA.

## ModuleViewModel

Module detail pages are secondary inspection/configuration surfaces. They must never be required to discover the system's top recommended actions.
