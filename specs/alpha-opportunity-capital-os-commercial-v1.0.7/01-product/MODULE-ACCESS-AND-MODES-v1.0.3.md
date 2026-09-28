# Module Access & User Modes v1.0.3

## User configuration

The product should ask for simple preferences, then compile them into structured policy:

- risk posture: STABLE / BALANCED / RETURN_SEEKING;
- max single allocation;
- max portfolio deployment;
- cross-venue allowed yes/no;
- asset conversion allowed yes/no;
- structured products allowed yes/no;
- options allowed yes/no;
- execution mode: GUIDED / ASSISTED / AUTO.

## Module visibility vs eligibility

A module can be visible but not live eligible. UI must display readiness distinctly:

- `AVAILABLE`
- `RESEARCH_ONLY`
- `PAPER_ONLY`
- `ASSISTED_AVAILABLE`
- `AUTO_AVAILABLE`
- `DISABLED`

Structured and Options default to `RESEARCH_ONLY` until their implementation packs and gates are completed.

## Portfolio rotation mode

- `OFF`: no portfolio recommendation; modules show opportunities only.
- `ADVISORY`: target allocation and moves are generated; owner chooses whether to execute.
- `AUTO_REBALANCE`: eligible moves execute automatically within explicit policy.

Commercial V1 default is `ADVISORY`.
