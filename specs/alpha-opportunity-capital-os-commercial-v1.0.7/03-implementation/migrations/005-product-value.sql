-- Commercial v1.0.5 Product Value & Survival Gate

CREATE TABLE IF NOT EXISTS product_value_reports (
  id                TEXT PRIMARY KEY,
  owner_id          TEXT NOT NULL,
  portfolio_id      TEXT NOT NULL,
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  report_version    TEXT NOT NULL,
  value_classification TEXT NOT NULL,
  expansion_decision    TEXT NOT NULL,
  survival_decision     TEXT NOT NULL,
  report_json       JSONB NOT NULL,
  report_hash       TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_value_reports_portfolio_period
ON product_value_reports (portfolio_id, period_end DESC);

CREATE TABLE IF NOT EXISTS operator_workload_daily (
  owner_id          TEXT NOT NULL,
  portfolio_id      TEXT NOT NULL,
  day               DATE NOT NULL,
  baseline_minutes  INTEGER NOT NULL CHECK (baseline_minutes >= 0),
  actual_minutes    INTEGER NOT NULL CHECK (actual_minutes >= 0),
  source_quality    TEXT NOT NULL,
  notes             TEXT,
  PRIMARY KEY (owner_id, portfolio_id, day)
);
