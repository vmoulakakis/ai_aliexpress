-- Pain-Gap Demand Intelligence RAG v2
create table if not exists public.ai_market_evidence_documents (
  id uuid primary key default gen_random_uuid(),
  market_code text not null default 'GR',
  problem_cluster_id uuid references public.market_problem_clusters(id) on delete cascade,
  source_family text not null,
  source_name text not null,
  source_url text not null,
  title text,
  snippet text,
  query_text text,
  evidence_kind text not null default 'market_evidence',
  purchase_intent numeric,
  pain_intensity numeric,
  exact_solution_evidence numeric,
  substitute_evidence numeric,
  competition_evidence numeric,
  price_evidence jsonb not null default '{}'::jsonb,
  availability_evidence jsonb not null default '{}'::jsonb,
  extracted_facts jsonb not null default '{}'::jsonb,
  content_hash text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(source_url, problem_cluster_id, evidence_kind)
);
create index if not exists ai_market_evidence_problem_idx
  on public.ai_market_evidence_documents(problem_cluster_id, observed_at desc);
create index if not exists ai_market_evidence_source_idx
  on public.ai_market_evidence_documents(source_name, observed_at desc);
create index if not exists ai_market_evidence_fts_idx
  on public.ai_market_evidence_documents using gin (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(snippet,'') || ' ' || coalesce(query_text,''))
  );

create table if not exists public.ai_greek_gap_assessments (
  id uuid primary key default gen_random_uuid(),
  problem_cluster_id uuid not null references public.market_problem_clusters(id) on delete cascade,
  market_code text not null default 'GR',
  lifecycle text,
  demand_state text,
  pain_state text,
  supply_state text,
  competition_state text,
  exact_match_state text,
  substitute_state text,
  price_gap_state text,
  buyer_intent_state text,
  conversion_opportunity text,
  confidence numeric,
  evidence_count integer not null default 0,
  evidence_ids jsonb not null default '[]'::jsonb,
  thesis text,
  counter_thesis text,
  next_actions jsonb not null default '[]'::jsonb,
  raw_output jsonb not null default '{}'::jsonb,
  assessed_at timestamptz not null default now()
);
create index if not exists ai_greek_gap_latest_idx
  on public.ai_greek_gap_assessments(problem_cluster_id, assessed_at desc);

alter table public.ai_market_evidence_documents enable row level security;
alter table public.ai_greek_gap_assessments enable row level security;
revoke all on public.ai_market_evidence_documents from anon, authenticated;
revoke all on public.ai_greek_gap_assessments from anon, authenticated;
grant all on public.ai_market_evidence_documents to service_role;
grant all on public.ai_greek_gap_assessments to service_role;
