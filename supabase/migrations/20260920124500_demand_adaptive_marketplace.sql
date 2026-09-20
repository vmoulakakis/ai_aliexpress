-- Demand-adaptive marketplace allocation for Greece.
-- Frozen demand evidence controls research depth; it is not a product-quality gate.
create or replace view public.ai_demand_allocation_v as
with latest_gap as (
  select distinct on (problem_cluster_id)
    problem_cluster_id,demand_state,buyer_intent_state,supply_state,competition_state,
    conversion_opportunity,confidence as gap_confidence,assessed_at
  from public.ai_greek_gap_assessments
  where market_code='GR'
  order by problem_cluster_id,assessed_at desc
),
scored as (
  select mp.id problem_cluster_id,mp.problem_key,mp.problem_title,mp.category,mp.subcategory,mp.target_customer,
    coalesce(mp.pain_severity_score,0)::numeric pain_severity_score,
    coalesce(mp.purchase_urgency_score,0)::numeric purchase_urgency_score,
    coalesce(mp.willingness_to_pay_score,0)::numeric willingness_to_pay_score,
    coalesce(mp.solution_clarity_score,0)::numeric solution_clarity_score,
    coalesce(mp.confidence,0)::numeric problem_confidence,
    lg.demand_state,lg.buyer_intent_state,lg.supply_state,lg.competition_state,
    lg.conversion_opportunity,coalesce(lg.gap_confidence,0)::numeric gap_confidence,
    (coalesce(mp.pain_severity_score,0)*.24+coalesce(mp.purchase_urgency_score,0)*.20+
     coalesce(mp.willingness_to_pay_score,0)*.18+coalesce(mp.solution_clarity_score,0)*.08+
     coalesce(mp.confidence,0)*100*.05+
     (case lg.demand_state when 'HIGH' then 100 when 'MEDIUM' then 70 when 'LOW' then 40 else 25 end)*.15+
     (case lg.buyer_intent_state when 'HIGH' then 100 when 'MEDIUM' then 70 when 'LOW' then 40 else 25 end)*.10)::numeric demand_score,
    ((coalesce(mp.pain_severity_score,0)*.24+coalesce(mp.purchase_urgency_score,0)*.20+
      coalesce(mp.willingness_to_pay_score,0)*.18+coalesce(mp.solution_clarity_score,0)*.08+
      coalesce(mp.confidence,0)*100*.05+
      (case lg.demand_state when 'HIGH' then 100 when 'MEDIUM' then 70 when 'LOW' then 40 else 25 end)*.15+
      (case lg.buyer_intent_state when 'HIGH' then 100 when 'MEDIUM' then 70 when 'LOW' then 40 else 25 end)*.10)*.78+
      coalesce(lg.gap_confidence,0)*100*.12+
      (case lg.supply_state when 'SCARCE' then 100 when 'LIMITED' then 80 when 'MIXED' then 60 when 'WELL_SERVED' then 30 else 50 end)*.10)::numeric research_priority_score
  from public.market_problem_clusters mp left join latest_gap lg on lg.problem_cluster_id=mp.id
  where mp.market_code='GR' and coalesce(mp.status,'active')<>'disabled'
)
select s.*,
 case when demand_score>=82 then 3 when demand_score>=68 then 2 when demand_score>=55 then 1 else 0 end::int winner_cap,
 case when demand_score>=82 then 24 when demand_score>=68 then 18 when demand_score>=55 then 12 else 8 end::int candidate_pool_target,
 case when demand_score>=82 then 12 when demand_score>=68 then 9 when demand_score>=55 then 6 else 4 end::int query_budget,
 case when demand_score>=82 then 4 when demand_score>=68 then 3 when demand_score>=55 then 2 else 1 end::int page_budget
from scored s;

create or replace view public.ai_category_demand_allocation_v as
select category,round(avg(demand_score),2) avg_demand_score,round(avg(research_priority_score),2) avg_research_priority_score,
 sum(winner_cap)::int product_capacity,count(*) filter(where winner_cap>0)::int active_pains,count(*)::int total_pains
from public.ai_demand_allocation_v group by category;

create or replace view public.ai_subcategory_demand_allocation_v as
select category,subcategory,round(avg(demand_score),2) avg_demand_score,round(avg(research_priority_score),2) avg_research_priority_score,
 sum(winner_cap)::int product_capacity,count(*) filter(where winner_cap>0)::int active_pains,count(*)::int total_pains
from public.ai_demand_allocation_v group by category,subcategory;
