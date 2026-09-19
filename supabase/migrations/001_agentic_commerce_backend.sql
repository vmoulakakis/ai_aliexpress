-- AI AliExpress backend schema for VMDB
-- Sole deterministic promotion gate: expected_commission_eur >= 10.

create extension if not exists pgcrypto;

create table if not exists public.ai_source_queries (
  id uuid primary key default gen_random_uuid(),
  market_code text not null default 'GR',
  source_key text not null default 'aliexpress',
  query_text text not null,
  problem_cluster_id uuid null,
  hypothesis jsonb not null default '{}'::jsonb,
  priority numeric null,
  status text not null default 'active',
  last_run_at timestamptz null,
  next_run_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_code, source_key, query_text)
);

create table if not exists public.ai_product_candidates (
  id uuid primary key default gen_random_uuid(),
  source_key text not null default 'aliexpress',
  source_product_id text not null,
  title text not null,
  canonical_title text null,
  product_url text null,
  image_url text null,
  category text null,
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  observed_at timestamptz not null default now(),
  unique (source_key, source_product_id)
);

create table if not exists public.ai_product_offers (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  source_offer_key text not null,
  seller_source_id text null,
  seller_name text null,
  seller_url text null,
  price_eur numeric null,
  original_price_eur numeric null,
  shipping_eur numeric null,
  commission_rate numeric null,
  expected_commission_eur numeric null,
  promotion_url text null,
  warehouse_country text null,
  fulfillment_evidence jsonb not null default '{}'::jsonb,
  seller_evidence jsonb not null default '{}'::jsonb,
  logistics_evidence jsonb not null default '{}'::jsonb,
  review_evidence jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  observed_at timestamptz not null default now(),
  unique (product_candidate_id, source_offer_key)
);

create table if not exists public.ai_demand_signals (
  id uuid primary key default gen_random_uuid(),
  market_code text not null default 'GR',
  topic_key text not null,
  problem_cluster_id uuid null,
  source_family text not null,
  source_name text not null,
  signal_type text not null,
  observed_value jsonb not null default '{}'::jsonb,
  evidence_url text null,
  evidence_text text null,
  observed_at timestamptz not null,
  collected_at timestamptz not null default now(),
  ai_relevance numeric null,
  ai_purchase_intent numeric null,
  ai_confidence numeric null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  market_code text not null default 'GR',
  topic_key text not null,
  problem_cluster_id uuid null,
  model_name text null,
  horizon_30 jsonb not null default '{}'::jsonb,
  horizon_60 jsonb not null default '{}'::jsonb,
  horizon_90 jsonb not null default '{}'::jsonb,
  expected_peak jsonb not null default '{}'::jsonb,
  drivers jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  confidence numeric null,
  evidence_ids uuid[] not null default '{}'::uuid[],
  raw_output jsonb not null default '{}'::jsonb,
  forecasted_at timestamptz not null default now()
);

create table if not exists public.ai_product_evaluations (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  offer_id uuid null references public.ai_product_offers(id) on delete cascade,
  problem_cluster_id uuid null,
  evaluator_role text not null,
  model_name text null,
  verdict text null,
  confidence numeric null,
  opportunity_thesis text null,
  risk_thesis text null,
  demand_analysis jsonb not null default '{}'::jsonb,
  greek_market_analysis jsonb not null default '{}'::jsonb,
  seller_analysis jsonb not null default '{}'::jsonb,
  fulfillment_analysis jsonb not null default '{}'::jsonb,
  economics_analysis jsonb not null default '{}'::jsonb,
  conversion_analysis jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  raw_output jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz not null default now()
);

create or replace view public.ai_promotion_candidates_v as
select
  p.id as product_candidate_id,
  p.source_product_id,
  p.title,
  p.canonical_title,
  p.product_url,
  p.image_url,
  p.category,
  o.id as offer_id,
  o.price_eur,
  o.original_price_eur,
  o.shipping_eur,
  o.commission_rate,
  o.expected_commission_eur,
  o.promotion_url,
  o.warehouse_country,
  o.seller_source_id,
  o.seller_name,
  o.fulfillment_evidence,
  o.seller_evidence,
  o.logistics_evidence,
  o.review_evidence,
  o.observed_at
from public.ai_product_candidates p
join public.ai_product_offers o on o.product_candidate_id=p.id
where coalesce(o.expected_commission_eur,0) >= 10;

comment on view public.ai_promotion_candidates_v is
'Only deterministic promotion gate: expected commission >= EUR 10. Everything else is AI-evaluated.';

create index if not exists ai_source_queries_next_idx on public.ai_source_queries(status,next_run_at,priority desc nulls last);
create index if not exists ai_product_offers_commission_idx on public.ai_product_offers(expected_commission_eur desc nulls last);
create index if not exists ai_demand_signals_topic_idx on public.ai_demand_signals(market_code,topic_key,observed_at desc);
create index if not exists ai_demand_forecasts_topic_idx on public.ai_demand_forecasts(market_code,topic_key,forecasted_at desc);
create index if not exists ai_product_evaluations_product_idx on public.ai_product_evaluations(product_candidate_id,evaluated_at desc);

alter table public.ai_source_queries enable row level security;
alter table public.ai_product_candidates enable row level security;
alter table public.ai_product_offers enable row level security;
alter table public.ai_demand_signals enable row level security;
alter table public.ai_demand_forecasts enable row level security;
alter table public.ai_product_evaluations enable row level security;

revoke all on public.ai_source_queries, public.ai_product_candidates, public.ai_product_offers,
 public.ai_demand_signals, public.ai_demand_forecasts, public.ai_product_evaluations from anon, authenticated;
revoke all on public.ai_promotion_candidates_v from anon, authenticated;

grant all on public.ai_source_queries, public.ai_product_candidates, public.ai_product_offers,
 public.ai_demand_signals, public.ai_demand_forecasts, public.ai_product_evaluations to service_role;
grant select on public.ai_promotion_candidates_v to service_role;
