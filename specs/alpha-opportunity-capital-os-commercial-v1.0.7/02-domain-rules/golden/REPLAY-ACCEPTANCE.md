# Replay Acceptance v1.0.1

Replay uses the exact production evaluators, not a separate backtest implementation.

## Required outputs

Per strategy/version:
- candidates / qualified count;
- assumed vs executable size bands;
- gross return; all cost components; expected net;
- simulated entry/exit timestamps;
- capacity utilization;
- max drawdown;
- profit concentration;
- expected-vs-simulated-realized error;
- stale/block reasons;
- sensitivity at fee +25%, slippage +50%, and capacity -50%.

## Stress acceptance

A strategy cannot promote if aggregate net becomes negative under **both**:
- fee +25%; and
- slippage +50%.

This is a robustness gate, not a guarantee. Cross-exchange spread additionally runs a one-leg adverse move stress equal to its emergency hedge budget.
