-- v1.0.4 calculation/facts closure
CREATE TABLE IF NOT EXISTS calculation_fact (
  id UUID PRIMARY KEY,
  owner_id UUID,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value JSONB NOT NULL,
  unit TEXT NOT NULL,
  quality TEXT NOT NULL,
  observed_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL,
  formula_id TEXT,
  formula_version TEXT,
  input_snapshot_hash TEXT,
  config_hash TEXT,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS calculation_fact_subject_idx ON calculation_fact(subject_type, subject_id);

CREATE TABLE IF NOT EXISTS calculation_trace (
  id UUID PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  formula_id TEXT NOT NULL,
  formula_version TEXT NOT NULL,
  input_snapshot_hash TEXT NOT NULL,
  config_hash TEXT,
  output_fact_id UUID NOT NULL REFERENCES calculation_fact(id),
  computed_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS calculation_trace_subject_idx ON calculation_trace(subject_type, subject_id);

CREATE TABLE IF NOT EXISTS instrument_normalization_snapshot (
  id UUID PRIMARY KEY,
  venue TEXT NOT NULL,
  venue_symbol TEXT NOT NULL,
  canonical_asset TEXT NOT NULL,
  settlement_asset TEXT,
  instrument_type TEXT NOT NULL,
  contract_model TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS valuation_fact (
  id UUID PRIMARY KEY,
  asset TEXT NOT NULL,
  canonical_currency TEXT NOT NULL DEFAULT 'USD',
  price NUMERIC NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  source_policy_version TEXT NOT NULL,
  source_refs JSONB NOT NULL,
  fact_hash TEXT NOT NULL UNIQUE
);

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS analysis_facts_ref TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS calculation_fact_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS trace_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE portfolio_recommendation ADD COLUMN IF NOT EXISTS calculation_fact_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE portfolio_recommendation ADD COLUMN IF NOT EXISTS trace_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
