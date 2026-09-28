-- v1.0.2 economic validation ledger
CREATE TABLE IF NOT EXISTS portfolio_nav_snapshots (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  nav_usd NUMERIC(30,10) NOT NULL,
  external_flow_usd NUMERIC(30,10) NOT NULL DEFAULT 0,
  evidence_hash TEXT NOT NULL,
  UNIQUE(portfolio_id, ts)
);

CREATE TABLE IF NOT EXISTS benchmark_nav_snapshots (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  benchmark_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  nav_usd NUMERIC(30,10) NOT NULL,
  daily_return_pct NUMERIC(20,10),
  source_hash TEXT NOT NULL,
  UNIQUE(portfolio_id, benchmark_id, ts)
);

CREATE TABLE IF NOT EXISTS product_run_costs (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL,
  amount_usd NUMERIC(30,10) NOT NULL CHECK (amount_usd >= 0),
  evidence_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alpha_proof_reports (
  report_id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  economic_status TEXT NOT NULL,
  decision TEXT NOT NULL,
  report_json JSONB NOT NULL,
  policy_version TEXT NOT NULL,
  report_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
