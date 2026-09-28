# Commercial Acceptance Tests

## Product

- [ ] Radar shows only qualified, non-stale opportunities by default.
- [ ] Opportunity detail exposes actual holding-period expected net return before annualized equivalent.
- [ ] Every opportunity displays data freshness and assumptions.
- [ ] No product copy claims guaranteed profit or risk-free return.

## Opportunity engine

- [ ] Same inputs + same strategy version reproduce same result.
- [ ] Fees/slippage can correctly turn a gross-positive candidate into non-qualified.
- [ ] Capacity changes with intended size/book depth.
- [ ] Funding interval/settlement timing is modeled.

## Execution

- [ ] PAPER uses same action plan and state concepts as live.
- [ ] ASSISTED requires final revalidation and confirmation.
- [ ] duplicate submits do not duplicate economic orders.
- [ ] one-leg failure path tested.
- [ ] partial fill path tested.
- [ ] restart recovery tested.
- [ ] kill switch blocks new entries.

## Security

- [ ] exchange secrets encrypted and absent from logs.
- [ ] browser has no raw credentials.
- [ ] AI has no credential or order-submit access.
- [ ] withdrawal-enabled credentials are prohibited/flagged.

## Accounting

- [ ] fees/funding/price P&L reconcile to venue records.
- [ ] expected-vs-realized error available per execution.
- [ ] unreconciled execution cannot silently disappear from dashboards.


## v1.0.1 domain completion

- [ ] All delivered strategy versions remain DRAFT until promotion evidence exists.
- [ ] Golden arithmetic fixtures pass exactly within specified tolerance.
- [ ] Risk score/level is reproducible from the same inputs.
- [ ] Allocator obeys reserve and all concentration caps.
- [ ] Expected and realized P&L components reconcile under the canonical accounting contract.
- [ ] No code path substitutes AI output for canonical formula/risk/execution policy.

## v1.0.6 personal owner experience

- [ ] Primary navigation is limited to Today / Opportunities / Positions / Portfolio / Performance.
- [ ] Today shows no more than three primary actions.
- [ ] OwnerActionCard uses canonical facts and shows monetary risk + evidence maturity.
- [ ] Reason / calculation / trace follow progressive disclosure.
- [ ] AI outage leaves deterministic owner workflow intact.
- [ ] opportunity/exit/risk/execution-failure alerts are deduped, current and actionable without bypassing confirmation.
- [ ] Capital Inventory shows ready/excess/shortfall capital without transfer automation or withdrawal permission.
