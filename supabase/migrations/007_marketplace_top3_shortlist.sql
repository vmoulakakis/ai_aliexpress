create table if not exists public.ai_marketplace_shortlist (
  id uuid primary key default gen_random_uuid(),
  problem_cluster_id uuid not null references public.market_problem_clusters(id) on delete cascade,
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  offer_id uuid null references public.ai_product_offers(id) on delete set null,
  rank smallint not null check (rank between 1 and 3),
  semantic_fit text not null check (semantic_fit in ('EXACT','STRONG_ADJACENT','WEAK','MISMATCH')),
  selection_score numeric(6,3) not null default 0,
  fit_score numeric(6,3) not null default 0,
  trust_score numeric(6,3) not null default 0,
  economics_score numeric(6,3) not null default 0,
  evidence_score numeric(6,3) not null default 0,
  diversity_key text,
  selection_reason jsonb not null default '{}'::jsonb,
  rejection_risks jsonb not null default '[]'::jsonb,
  model_name text,
  shortlist_version text not null default 'marketplace-top3-v1',
  selected_at timestamptz not null default now(),
  unique(problem_cluster_id, product_candidate_id),
  unique(problem_cluster_id, rank)
);

create index if not exists ai_marketplace_shortlist_problem_idx
  on public.ai_marketplace_shortlist(problem_cluster_id, rank);

alter table public.ai_marketplace_shortlist enable row level security;
revoke all on public.ai_marketplace_shortlist from anon, authenticated;
grant all on public.ai_marketplace_shortlist to service_role;

create or replace view public.ai_marketplace_selected_v as
select
  s.rank as marketplace_rank,
  s.semantic_fit,
  s.selection_score,
  s.fit_score,
  s.trust_score,
  s.economics_score,
  s.evidence_score,
  s.diversity_key,
  s.selection_reason,
  s.rejection_risks,
  s.model_name as shortlist_model,
  s.shortlist_version,
  s.selected_at,
  l.*
from public.ai_marketplace_shortlist s
join public.ai_product_learning_v l
  on l.product_candidate_id=s.product_candidate_id
 and l.problem_cluster_id=s.problem_cluster_id
where s.semantic_fit in ('EXACT','STRONG_ADJACENT')
order by l.problem_key, s.rank;

comment on view public.ai_marketplace_selected_v is
'Consumer-facing marketplace selection. Maximum three AI-selected products per pain/problem cluster; full research pool remains in ai_product_learning_v.';
