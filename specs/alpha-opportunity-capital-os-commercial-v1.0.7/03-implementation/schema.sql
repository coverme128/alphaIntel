-- Minimal commercial reference schema. Codex may convert to ORM migrations.
create extension if not exists pgcrypto;

create table owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table venue_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id),
  venue text not null,
  label text not null,
  credential_ref text not null,
  can_read boolean not null default true,
  can_trade boolean not null default false,
  withdrawal_detected boolean not null default false,
  fee_tier jsonb,
  health_status text not null default 'UNKNOWN',
  created_at timestamptz not null default now(),
  unique(owner_id, venue, label)
);

create table strategy_versions (
  id text not null,
  version text not null,
  family text not null,
  status text not null,
  config jsonb not null,
  config_hash text not null,
  created_at timestamptz not null default now(),
  primary key(id, version)
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners(id),
  strategy_id text not null,
  strategy_version text not null,
  status text not null,
  observed_at timestamptz not null,
  fresh_until timestamptz not null,
  payload jsonb not null,
  input_hash text not null,
  created_at timestamptz not null default now()
);
create index opportunities_live_idx on opportunities(status, fresh_until desc);

create table risk_policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id),
  version integer not null,
  policy jsonb not null,
  created_at timestamptz not null default now(),
  unique(owner_id, version)
);

create table action_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id),
  opportunity_id uuid not null references opportunities(id),
  risk_policy_id uuid not null references risk_policies(id),
  mode text not null,
  expires_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table executions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id),
  action_plan_id uuid not null references action_plans(id),
  state text not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table execution_legs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references executions(id),
  venue_account_id uuid not null references venue_accounts(id),
  client_order_id text not null,
  venue_order_id text,
  state text not null,
  intent jsonb not null,
  filled_qty numeric,
  avg_fill_price numeric,
  fee jsonb,
  created_at timestamptz not null default now(),
  unique(venue_account_id, client_order_id)
);

create table cashflows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id),
  execution_id uuid references executions(id),
  venue_account_id uuid references venue_accounts(id),
  type text not null,
  asset text not null,
  amount numeric not null,
  occurred_at timestamptz not null,
  external_ref text,
  payload jsonb
);

create table pnl_reconciliations (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null unique references executions(id),
  expected jsonb not null,
  realized jsonb not null,
  status text not null,
  reconciled_at timestamptz
);

create table kill_switch_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id),
  scope text not null,
  scope_key text,
  enabled boolean not null,
  reason text not null,
  created_at timestamptz not null default now()
);
