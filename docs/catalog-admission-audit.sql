-- FOUND / AXI catalog admission audit (read-only)
-- Run against vmdb (gqpbskssrvpfjtujwezc).
-- Candidates are NOT approved products; never equate offer count with verified inventory.
select source_key, count(*) as candidate_count,
       count(*) filter (where product_url is not null and title is not null and image_url is not null) as basic_identity_complete,
       min(first_seen_at) as earliest_seen, max(first_seen_at) as latest_seen
from public.ai_product_candidates group by source_key order by candidate_count desc;

select count(*) as offers,
       count(*) filter (where price_eur > 0) as priced,
       count(*) filter (where promotion_url is not null and promotion_url <> '') as affiliate_url_present,
       count(*) filter (where expected_commission_eur > 10) as commission_over_10_estimated,
       count(*) filter (where expected_commission_eur is null) as commission_unknown
from public.ai_product_offers;

select 'verified_pain_winners' as catalog_stage,count(*) as records from public.ai_marketplace_products_v
union all
select 'category_top10',count(*) from public.ai_category_marketplace_products_v;

-- Admission rule: only evidence-backed, independently audited products may be
-- marked VERIFIED or PREMIUM. All other candidates stay RESEARCH_ONLY.
-- A non-null affiliate URL or an estimated commission is not proof of tracking.
-- Never backfill approved views by copying all candidate rows.
