create or replace view public.ai_product_learning_v as
with latest_intel as (
  select distinct on(product_candidate_id) *
  from public.ai_product_intelligence
  order by product_candidate_id,generated_at desc
),
latest_seo as (
  select distinct on(product_candidate_id) *
  from public.ai_product_seo_intelligence
  order by product_candidate_id,generated_at desc
),
latest_detail as (
  select distinct on(product_candidate_id) *
  from public.ai_product_detail_snapshots
  order by product_candidate_id,scraped_at desc
),
counts as (
  select p.id product_candidate_id,
    (select count(*) from public.ai_product_facts f where f.product_candidate_id=p.id) fact_count,
    (select count(*) from public.ai_product_media m where m.product_candidate_id=p.id) media_count,
    (select count(*) from public.ai_product_reviews r where r.product_candidate_id=p.id) review_count,
    (select count(*) from public.ai_product_specifications s where s.product_candidate_id=p.id) spec_count
  from public.ai_product_candidates p
)
select
 v.product_candidate_id,v.offer_id,
 p.source_product_id,p.title,p.category,p.product_url,p.image_url,
 v.price_eur,v.expected_commission_eur,v.commission_rate,v.promotion_url,
 d.problem_cluster_id,mp.problem_key,mp.problem_title,mp.target_customer,
 gi.conversion_opportunity as greek_gap_opportunity,gi.confidence as greek_gap_confidence,
 ld.sold_count,ld.seller_source_id,ld.raw_payload as official_detail,
 li.product_identity,li.pain_feature_map,li.winning_factors,li.dealbreakers,
 li.pros,li.cons,li.review_sentiment,li.seller_quality,li.fulfillment_analysis,
 li.price_value_analysis,li.greek_fit_analysis,li.conversion_analysis,
 li.audience_personas,li.who_not_for,li.objection_handling,li.evidence_gaps,
 li.confidence as intelligence_confidence,
 ls.primary_keyword,ls.secondary_keywords,ls.long_tail_keywords,ls.semantic_entities,
 ls.search_intents,ls.pain_queries,ls.comparison_queries,ls.faq_questions,
 ls.title_options,ls.meta_description_options,ls.content_brief,ls.confidence as seo_confidence,
 c.fact_count,c.media_count,c.review_count,c.spec_count,
 case
   when c.review_count>0 and c.spec_count>0 and c.media_count>=3 then 'RICH'
   when c.fact_count>=8 and c.media_count>=1 then 'BASELINE'
   else 'THIN'
 end as data_completeness
from public.ai_promotion_candidates_v v
join public.ai_product_candidates p on p.id=v.product_candidate_id
left join latest_detail ld on ld.product_candidate_id=v.product_candidate_id
left join latest_intel li on li.product_candidate_id=v.product_candidate_id
left join latest_seo ls on ls.product_candidate_id=v.product_candidate_id
left join lateral (
 select problem_cluster_id from public.ai_product_discoveries x
 where x.product_candidate_id=v.product_candidate_id
 order by x.result_rank asc nulls last,x.discovered_at desc limit 1
) d on true
left join public.market_problem_clusters mp on mp.id=d.problem_cluster_id
left join lateral (
 select conversion_opportunity,confidence from public.ai_greek_gap_assessments g
 where g.problem_cluster_id=d.problem_cluster_id
 order by g.assessed_at desc limit 1
) gi on true
left join counts c on c.product_candidate_id=v.product_candidate_id;

create or replace view public.ai_product_enrichment_queue_v as
select
 product_candidate_id,source_product_id,title,expected_commission_eur,
 data_completeness,fact_count,media_count,review_count,spec_count,
 case
   when review_count=0 then 'REVIEWS'
   when spec_count=0 then 'SPECS'
   when media_count<3 then 'GALLERY'
   else 'COMPLETE'
 end as next_enrichment_need
from public.ai_product_learning_v
where data_completeness<>'RICH'
order by expected_commission_eur desc nulls last;
