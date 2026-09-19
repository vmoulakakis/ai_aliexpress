-- Product Intelligence RAG v1
create table if not exists public.ai_product_detail_snapshots (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  offer_id uuid references public.ai_product_offers(id) on delete set null,
  source text not null,
  source_url text,
  market_code text not null default 'GR',
  title text,
  category text,
  seller_name text,
  seller_source_id text,
  rating numeric,
  review_count integer,
  sold_count integer,
  price_eur numeric,
  original_price_eur numeric,
  shipping_eur numeric,
  currency text default 'EUR',
  raw_payload jsonb not null default '{}'::jsonb,
  scraped_at timestamptz not null default now(),
  unique(product_candidate_id, source, scraped_at)
);
create index if not exists ai_product_detail_snapshots_product_idx
  on public.ai_product_detail_snapshots(product_candidate_id, scraped_at desc);

create table if not exists public.ai_product_media (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  media_type text not null check(media_type in ('image','video','review_image')),
  url text not null,
  position integer,
  alt_text text,
  source text not null,
  source_url text,
  evidence jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  unique(product_candidate_id, media_type, url)
);
create index if not exists ai_product_media_product_idx on public.ai_product_media(product_candidate_id,media_type,position);

create table if not exists public.ai_product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  spec_key text not null,
  spec_value text,
  normalized_key text,
  normalized_value jsonb not null default '{}'::jsonb,
  source text not null,
  source_url text,
  confidence numeric,
  observed_at timestamptz not null default now(),
  unique(product_candidate_id,spec_key,source)
);
create index if not exists ai_product_specs_product_idx on public.ai_product_specifications(product_candidate_id);

create table if not exists public.ai_product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  external_review_id text,
  source text not null,
  source_url text,
  rating numeric,
  review_date date,
  reviewer_country text,
  variant text,
  review_text text,
  original_text text,
  helpful_count integer,
  image_urls jsonb not null default '[]'::jsonb,
  seller_reply text,
  verified_purchase boolean,
  raw_payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  unique(product_candidate_id,source,external_review_id)
);
create index if not exists ai_product_reviews_product_idx on public.ai_product_reviews(product_candidate_id,rating,review_date desc);
create index if not exists ai_product_reviews_fts_idx on public.ai_product_reviews using gin(
  to_tsvector('simple',coalesce(review_text,'')||' '||coalesce(original_text,''))
);

create table if not exists public.ai_product_facts (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  fact_type text not null,
  fact_key text not null,
  fact_value jsonb not null,
  source text not null,
  source_url text,
  confidence numeric not null default 0.5,
  evidence_text text,
  observed_at timestamptz not null default now(),
  unique(product_candidate_id,fact_type,fact_key,source)
);
create index if not exists ai_product_facts_product_idx on public.ai_product_facts(product_candidate_id,fact_type);
create index if not exists ai_product_facts_fts_idx on public.ai_product_facts using gin(
  to_tsvector('simple',coalesce(fact_key,'')||' '||coalesce(evidence_text,''))
);

create table if not exists public.ai_product_intelligence (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  offer_id uuid references public.ai_product_offers(id) on delete set null,
  problem_cluster_id uuid references public.market_problem_clusters(id) on delete set null,
  model_name text not null,
  intelligence_version text not null default 'product-intel-v1',
  product_identity jsonb not null default '{}'::jsonb,
  pain_feature_map jsonb not null default '[]'::jsonb,
  winning_factors jsonb not null default '[]'::jsonb,
  dealbreakers jsonb not null default '[]'::jsonb,
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  review_sentiment jsonb not null default '{}'::jsonb,
  seller_quality jsonb not null default '{}'::jsonb,
  fulfillment_analysis jsonb not null default '{}'::jsonb,
  price_value_analysis jsonb not null default '{}'::jsonb,
  greek_fit_analysis jsonb not null default '{}'::jsonb,
  conversion_analysis jsonb not null default '{}'::jsonb,
  audience_personas jsonb not null default '[]'::jsonb,
  who_not_for jsonb not null default '[]'::jsonb,
  objection_handling jsonb not null default '[]'::jsonb,
  evidence_gaps jsonb not null default '[]'::jsonb,
  confidence numeric,
  raw_output jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);
create index if not exists ai_product_intelligence_product_idx on public.ai_product_intelligence(product_candidate_id,generated_at desc);

create table if not exists public.ai_product_seo_intelligence (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  problem_cluster_id uuid references public.market_problem_clusters(id) on delete set null,
  language text not null default 'el',
  market_code text not null default 'GR',
  primary_keyword text,
  secondary_keywords jsonb not null default '[]'::jsonb,
  long_tail_keywords jsonb not null default '[]'::jsonb,
  semantic_entities jsonb not null default '[]'::jsonb,
  search_intents jsonb not null default '[]'::jsonb,
  pain_queries jsonb not null default '[]'::jsonb,
  comparison_queries jsonb not null default '[]'::jsonb,
  faq_questions jsonb not null default '[]'::jsonb,
  title_options jsonb not null default '[]'::jsonb,
  meta_description_options jsonb not null default '[]'::jsonb,
  schema_hints jsonb not null default '{}'::jsonb,
  internal_link_topics jsonb not null default '[]'::jsonb,
  content_brief jsonb not null default '{}'::jsonb,
  confidence numeric,
  evidence jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);
create index if not exists ai_product_seo_product_idx on public.ai_product_seo_intelligence(product_candidate_id,generated_at desc);

create table if not exists public.ai_product_learning_events (
  id uuid primary key default gen_random_uuid(),
  product_candidate_id uuid not null references public.ai_product_candidates(id) on delete cascade,
  offer_id uuid references public.ai_product_offers(id) on delete set null,
  event_type text not null,
  event_value jsonb not null default '{}'::jsonb,
  source text not null,
  occurred_at timestamptz not null default now()
);
create index if not exists ai_product_learning_events_product_idx on public.ai_product_learning_events(product_candidate_id,event_type,occurred_at desc);

alter table public.ai_product_detail_snapshots enable row level security;
alter table public.ai_product_media enable row level security;
alter table public.ai_product_specifications enable row level security;
alter table public.ai_product_reviews enable row level security;
alter table public.ai_product_facts enable row level security;
alter table public.ai_product_intelligence enable row level security;
alter table public.ai_product_seo_intelligence enable row level security;
alter table public.ai_product_learning_events enable row level security;
revoke all on public.ai_product_detail_snapshots,public.ai_product_media,public.ai_product_specifications,
 public.ai_product_reviews,public.ai_product_facts,public.ai_product_intelligence,
 public.ai_product_seo_intelligence,public.ai_product_learning_events from anon,authenticated;
grant all on public.ai_product_detail_snapshots,public.ai_product_media,public.ai_product_specifications,
 public.ai_product_reviews,public.ai_product_facts,public.ai_product_intelligence,
 public.ai_product_seo_intelligence,public.ai_product_learning_events to service_role;
