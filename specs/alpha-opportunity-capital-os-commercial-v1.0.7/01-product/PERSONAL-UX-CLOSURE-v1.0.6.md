# Personal UX & Action Experience Closure — v1.0.6

## Goal

Make the owner experience simpler than the underlying trading system while preserving every production safety and economic-truth control.

## Primary owner job

The product must answer, in order:

1. **What do I need to do now?**
2. **How much capital is involved?**
3. **What can I reasonably expect to earn and lose?**
4. **How mature/trustworthy is this strategy evidence?**
5. **What will make me exit or cancel?**
6. **Did the product actually create value after execution?**

The owner must not be required to understand internal module/readiness/state-machine terminology to complete those jobs.

## Primary navigation

Only five first-level surfaces:

- `Today`
- `Opportunities`
- `Positions`
- `Portfolio`
- `Performance`

The following are secondary/advanced surfaces:

- Connections
- Replay Lab
- Risk configuration
- Module registry/readiness
- Calculation Trace
- Raw market diagnostics
- AI/provider settings
- operational health

## Today

Today is the default home and must contain:

- total equity;
- deployed capital;
- free/ready capital;
- current month realized net P&L;
- excess return/benchmark summary when evidence exists;
- active positions requiring attention;
- **maximum three** primary Capital Actions.

No more than three actions may compete for primary visual attention. Additional qualified opportunities belong in Opportunities.

## Canonical user actions

`EXECUTE` — allocate new capital to a qualified opportunity.

`ROTATE` — move capital from an existing lower-utility position/cash allocation to a materially better eligible target after all switching costs and churn guards.

`EXIT` — close an active position because an exit/risk/invalidating condition is active.

`HOLD` — explicitly keep an existing allocation because no target is materially better or because switching does not pass policy.

`KEEP_CASH` — leave eligible capital unallocated because no opportunity passes economic/risk thresholds.

`HOLD` and `KEEP_CASH` are valid successful recommendations, not empty states.

## Action card — default layer

Required default fields:

- action type;
- plain-language strategy/asset;
- capital amount;
- expected holding-period net P&L shown as USD range/value and percent;
- modeled downside/stress-loss amount when available;
- risk label in user language;
- strategy evidence maturity;
- expected holding time / validity window;
- one primary CTA.

Example:

```text
ETH Funding
建议：执行
资金：8,000 USDT
预计净收益：+$13–$17 (0.16%–0.21%)
压力情景损失：-$42
风险：中低
策略证据：Live 验证中
预计持有：12–24h
[确认执行]
```

## Progressive disclosure

Layer 1 — **Action**: what to do, money involved, expected net result, key risk, maturity.

Layer 2 — **Why**: deterministic qualification/rotation/exit reason codes translated to user language.

Layer 3 — **Calculation Details**: gross return, expected costs, reserves, capacity-by-size, margin facts, entry/exit assumptions.

Layer 4 — **Professional Trace**: formula ID/version, snapshot IDs/hashes, raw canonical facts, config versions.

Layer 4 is never required for ordinary execution.

## Risk presentation

Do not make an internal composite score the user's primary risk representation.

Prefer, where applicable:

- `capitalAtRiskUsd`;
- modeled stress-loss USD;
- emergency-exit cost USD;
- liquidation distance percent;
- margin buffer USD;
- top one or two risk reasons.

Internal risk score remains available in calculation details.

## Strategy maturity presentation

Every actionable opportunity must show one of the user-readable evidence states mapped from canonical economic/readiness states:

- `尚未验证` — UNPROVEN;
- `历史回放通过` — REPLAY_POSITIVE;
- `模拟运行通过` — PAPER_POSITIVE;
- `小额实盘验证中/通过` — LIVE_POSITIVE;
- `Alpha 已验证` — ALPHA_VALIDATED.

Expected return may never hide or visually outrank maturity status.

## AI

AI is optional and never required for the primary workflow. In `AI_ENHANCED`, contextual explanation may appear as `为什么?`, `解释风险`, `为什么 HOLD?`, `为什么退出?`, `预计和实际为什么不同?`.

No standalone AI workspace and no natural-language opportunity/portfolio query are part of Commercial V1.

If AI is disabled or unavailable, deterministic templates generated from reason codes and canonical facts preserve the entire decision workflow. The single `Decision & Analysis Export` remains available in all modes.

## Empty states

No qualified opportunity:

`当前没有符合净收益、风险和容量门槛的机会，建议保持现金。`

No action needed:

`当前配置无需调整。`

This is a valid positive state, not an error.
