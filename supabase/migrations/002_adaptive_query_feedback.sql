alter table public.ai_source_queries
  add column if not exists last_result_count integer null,
  add column if not exists last_eligible_count integer null,
  add column if not exists consecutive_zero_runs integer not null default 0,
  add column if not exists last_error text null,
  add column if not exists query_family text null,
  add column if not exists parent_query_id uuid null,
  add column if not exists agent_feedback jsonb not null default '{}'::jsonb;

create index if not exists ai_source_queries_feedback_idx
  on public.ai_source_queries(status, consecutive_zero_runs desc, last_run_at desc nulls last);
