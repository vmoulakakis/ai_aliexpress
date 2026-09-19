
create table if not exists public.ai_product_discoveries (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  source_query_id uuid not null references public.ai_source_queries(id) on delete cascade,
  problem_cluster_id uuid null references public.market_problem_clusters(id) on delete set null,
  retrieval_mode text not null default 'relevance',
  result_rank integer null,
  query_text text not null,
  discovered_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(product_candidate_id, source_query_id, retrieval_mode)
);
create index if not exists ai_product_discoveries_problem_idx
  on public.ai_product_discoveries(problem_cluster_id, discovered_at desc);
create index if not exists ai_product_discoveries_query_idx
  on public.ai_product_discoveries(source_query_id, discovered_at desc);
alter table public.ai_product_discoveries enable row level security;
revoke all on public.ai_product_discoveries from anon, authenticated;
grant all on public.ai_product_discoveries to service_role;
