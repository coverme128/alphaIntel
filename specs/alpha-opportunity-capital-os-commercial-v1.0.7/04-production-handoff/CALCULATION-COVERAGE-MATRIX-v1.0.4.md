# Calculation Coverage Matrix v1.0.4

| User question | Required calculation facts | UI surface | AI may explain? |
|---|---|---|---|
| Is this actually an opportunity? | gross, costs, reserves, qualification reason codes | Opportunity | Yes |
| How much might I make? | holding-period expected net, expected P&L at chosen size | Opportunity / Action Plan | Yes |
| Why not the headline APR? | return normalization + repeatability | Opportunity details | Yes |
| Why only invest this amount? | economics-by-size, marginal net, portfolio caps | Action Plan / Portfolio | Yes |
| Is it safe enough? | risk dimensions, margin/liquidation, venue/asset tiers | Opportunity / Execution | Yes |
| Why HOLD instead of rotate? | source remaining net, target marginal net, switching cost, churn guard | Today / Portfolio | Yes |
| What will the whole plan earn? | expected plan P&L, capital days, equity impact | Today / Portfolio | Yes |
| Why did realized differ from expected? | expected cost/reserves vs realized P&L attribution | Performance | Yes |
| Did the system add value? | NAV/TWR, benchmark TWR, run cost, economic value | Performance / Alpha Proof | Yes |
| Where did this number come from? | CalculationTrace / formula/version/input snapshot | Advanced details | Yes |

## Coverage gate

A user-facing number used to justify an allocation, execution, exit, risk label or performance claim MUST map to a canonical calculation fact. Presentation-only numbers (counts, timestamps, labels) are excluded.
