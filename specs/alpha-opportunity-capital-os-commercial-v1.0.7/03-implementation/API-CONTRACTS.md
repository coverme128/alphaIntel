# Internal API Contracts

A REST/JSON reference is sufficient for Commercial V1; internal modules may call services directly if deployed as a modular monolith.

## Opportunity

- `GET /v1/opportunities`
- `GET /v1/opportunities/:id`
- `POST /v1/opportunities/:id/revalidate`
- `POST /v1/opportunities/:id/action-plan`

Filters: strategy, venue, asset, risk level, minimum expected net return, maximum capital, freshness.

## Capital

- `GET /v1/portfolio`
- `POST /v1/allocation/propose`
- `GET /v1/exposures`

## Execution

- `POST /v1/executions/paper`
- `POST /v1/executions/assisted`
- `POST /v1/executions/auto-policy/validate`
- `POST /v1/executions/:id/cancel`
- `POST /v1/executions/:id/exit`
- `GET /v1/executions/:id`

Live assisted submit requires a short-lived confirmation token bound to the plan hash.

## Risk

- `GET /v1/risk-policy`
- `PUT /v1/risk-policy`
- `POST /v1/kill-switch`
- `GET /v1/kill-switch`

## Connections

- `POST /v1/venues/:venue/validate-read`
- `POST /v1/venues/:venue/validate-trade`
- `GET /v1/venues/health`

## AI

- `POST /v1/ai/explain-opportunity`
- `POST /v1/ai/explain-risk`
- `POST /v1/ai/parse-filter`

AI endpoints cannot call execution endpoints and receive no credential material.
