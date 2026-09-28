-- v1.0.3 module / portfolio orchestration additions
CREATE TABLE IF NOT EXISTS alpha_module_state (
  module_id TEXT PRIMARY KEY,
  implementation_status TEXT NOT NULL,
  economic_status TEXT NOT NULL,
  execution_ceiling TEXT NOT NULL,
  allocation_eligibility TEXT NOT NULL,
  registry_version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_recommendation (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL,
  portfolio_equity_usd NUMERIC NOT NULL,
  expected_incremental_net_pct NUMERIC,
  expected_turnover_pct NUMERIC,
  policy_version TEXT NOT NULL,
  payload JSONB NOT NULL,
  recommendation_hash TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS capital_action_plan (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  portfolio_recommendation_id UUID NOT NULL REFERENCES portfolio_recommendation(id),
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  policy_version TEXT NOT NULL,
  payload JSONB NOT NULL
);
