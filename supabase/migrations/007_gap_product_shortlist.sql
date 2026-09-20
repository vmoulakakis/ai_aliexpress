create table if not exists public.ai_gap_product_shortlist (
  id uuid primary key default gen_random_uuid(),
  problem_cluster_id uuid not null references public.market_problem_clusters(id) on delete cascade,
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  offer_id uuid references public.ai_product_offers(id) on delete cascade,
  selection_role text not null check (selection_role in ('best_overall','best_value','pro_choice')),
  rank smallint not null check (rank between 1 and 3),
  verdict text not null default 'SELECTED' check (verdict in ('SELECTED','REJECTED','HOLD')),
  confidence numeric,
  product_problem_fit numeric,
  differentiation_score numeric,
  selection_thesis text,
  rejection_risks jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  model_name text,
  research_run_id text,
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(problem_cluster_id, rank),
  unique(problem_cluster_id, product_candidate_id)
);

create index if not exists ai_gap_product_shortlist_problem_idx
  on public.ai_gap_product_shortlist(problem_cluster_id, rank);

alter table public.ai_gap_product_shortlist enable row level security;
revoke all on table public.ai_gap_product_shortlist from anon, authenticated;
grant all on table public.ai_gap_product_shortlist to service_role;

create or replace view public.ai_marketplace_selected_v as
select
  l.*,
  s.selection_role,
  s.rank as pain_rank,
  s.confidence as selection_confidence,
  s.product_problem_fit,
  s.differentiation_score,
  s.selection_thesis,
  s.rejection_risks,
  s.evidence as selection_evidence,
  s.selected_at
from public.ai_product_learning_v l
join public.ai_gap_product_shortlist s
  on s.product_candidate_id = l.product_candidate_id
 and (s.offer_id is null or s.offer_id = l.offer_id)
where s.verdict = 'SELECTED'
order by l.problem_cluster_id, s.rank;
