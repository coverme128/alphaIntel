# Alpha Proof Runbook

Daily:
1. reconcile all terminal orders/cashflows;
2. snapshot NAV and external flows;
3. update shadow benchmark NAV;
4. post infrastructure/service run costs;
5. recompute rolling economic evidence;
6. evaluate demotion/stop rules;
7. persist signed/hash report facts.

Weekly:
- inspect expected vs realized decomposition;
- inspect fee/slippage error;
- inspect profit concentration and venue/asset concentration;
- inspect opportunity decay and rejected opportunities;
- do not tune thresholds based on a single week.

Monthly:
- produce Alpha Proof report;
- compare actual portfolio versus benchmark shadow;
- classify `KEEP_SCOPE`, `DO_NOT_EXPAND`, `EXPANSION_WORTHY`, or `STOP_TRADING`;
- any parameter change creates a new config version and resets evidence for that changed version as required by policy.
