#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,os,sys
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call,_oidc_token

AI_GATEWAY=os.getenv("AI_RESEARCH_GATEWAY","https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/ai-aliexpress-research-gateway")
MODEL=os.getenv("DEEP_PRODUCT_RESEARCH_MODEL","deepseek-v4-pro")
MARKET="GR"

def ask(system:str,payload:Any)->dict[str,Any]:
    token=_oidc_token()
    r=requests.post(AI_GATEWAY,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"},
      json={"system":system,"payload":payload,"max_tokens":3200},timeout=220)
    if not r.ok:
      raise RuntimeError(f"ai_gateway_{r.status_code}:{r.text[:700]}")
    body=r.json()
    if not body.get("ok"): raise RuntimeError(body)
    return body.get("data") or {}

def problems(limit:int):
    return list(db_call("GET","market_problem_clusters",params={
      "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory",
      "market_code":"eq.GR","order":"updated_at.desc","limit":str(limit)}) or [])

def latest_gap(problem_id:str):
    rows=list(db_call("GET","ai_greek_gap_assessments",params={
      "select":"conversion_opportunity,confidence,demand_state,pain_state,supply_state,competition_state,exact_match_state,substitute_state,price_gap_state,buyer_intent_state,thesis,counter_thesis,next_actions",
      "problem_cluster_id":f"eq.{problem_id}","order":"assessed_at.desc","limit":"1"}) or [])
    return rows[0] if rows else {}

def query_history(problem_id:str):
    return list(db_call("GET","ai_source_queries",params={
      "select":"query_text,query_family,last_result_count,last_eligible_count,consecutive_zero_runs,agent_feedback",
      "problem_cluster_id":f"eq.{problem_id}","order":"last_run_at.desc.nullslast,priority.desc","limit":"80"}) or [])

PLAN_SYSTEM="""You are the Deep AliExpress Retrieval Planner.
The Greek Demand Intelligence is FROZEN and authoritative. Do not reassess demand.
Your only job is to discover a broad, diverse AliExpress candidate pool for ONE supplied pain.

Use the frozen pain/gap context and prior AliExpress result vocabulary.
Produce 14-20 short marketplace queries covering DISTINCT retrieval angles:
- exact product noun
- alternate seller nouns/synonyms
- mechanisms/technologies
- professional/industrial terminology
- component/system variants
- adjacent solution mechanisms
- budget/prosumer naming only when it changes the physical product class
- diagnostic vs monitoring vs prevention variants when relevant

Rules:
- English marketplace terminology, 1-7 words preferred.
- No Greece/EU/shipping/review/rating/price/commission filters.
- Do not repeat prior zero-result queries unchanged.
- Learn vocabulary from successful result samples.
- Seek breadth before judgment. Quality filtering happens later.
- Avoid near-duplicate queries with the same nouns reordered.
Return strict JSON:
{
 "strategy":"...",
 "queries":[
   {"query":"...","query_family":"exact|synonym|mechanism|professional|component|adjacent|diagnostic|monitoring|prevention","hypothesis":"...","reason":"..."}
 ]
}
"""

def plan(limit:int):
    made=0
    for topic in problems(limit):
        gap=latest_gap(topic["id"])
        if not gap: continue
        hist=query_history(topic["id"])
        feedback=[]
        for h in hist:
            fb=h.get("agent_feedback") or {}
            feedback.append({
              "query":h.get("query_text"),"family":h.get("query_family"),
              "results":h.get("last_result_count"),"eligible":h.get("last_eligible_count"),
              "zero_runs":h.get("consecutive_zero_runs"),
              "sample_results":(fb.get("sample_results") or [])[:8]
            })
        out=ask(PLAN_SYSTEM,{"problem":topic,"frozen_gap":gap,"prior_aliexpress_feedback":feedback})
        seen=set()
        for i,x in enumerate(out.get("queries") or []):
            q=" ".join(str(x.get("query") or "").split()).strip()
            if not q: continue
            norm=q.lower()
            if norm in seen: continue
            seen.add(norm)
            db_call("POST","ai_source_queries",
              params={"on_conflict":"market_code,source_key,query_text"},
              data={
                "market_code":MARKET,"source_key":"aliexpress","query_text":q,
                "problem_cluster_id":topic["id"],
                "hypothesis":x,
                "query_family":str(x.get("query_family") or "deep_research"),
                "priority":180-i,
                "status":"active",
                "agent_feedback":{
                  "generation":"deep_aliexpress_research_v1",
                  "frozen_demand":True,
                  "retrieval_strategy":out.get("strategy")
                }
              },prefer="resolution=merge-duplicates,return=minimal")
            made+=1
    print(json.dumps({"event":"deep_query_plan_complete","queries_written":made}))

def candidate_pool(problem_id:str,cap:int):
    # Candidate IDs connected to this pain, then hydrate from learning view.
    ds=list(db_call("GET","ai_product_discoveries",params={
      "select":"product_candidate_id,result_rank,retrieval_mode,query_text,discovered_at",
      "problem_cluster_id":f"eq.{problem_id}",
      "order":"result_rank.asc.nullslast,discovered_at.desc","limit":"1000"}) or [])
    ids=[]
    discovery={}
    for d in ds:
        pid=d.get("product_candidate_id")
        if not pid: continue
        if pid not in ids: ids.append(pid)
        discovery.setdefault(pid,[]).append(d)
    rows=[]
    for pid in ids:
        rr=list(db_call("GET","ai_product_learning_v",params={
          "select":"product_candidate_id,offer_id,source_product_id,title,category,image_url,price_eur,expected_commission_eur,promotion_url,problem_cluster_id,problem_key,problem_title,target_customer,greek_gap_opportunity,greek_gap_confidence,sold_count,seller_source_id,pain_feature_map,winning_factors,dealbreakers,pros,cons,seller_quality,fulfillment_analysis,price_value_analysis,greek_fit_analysis,conversion_analysis,who_not_for,evidence_gaps,intelligence_confidence,fact_count,media_count,review_count,spec_count,data_completeness",
          "product_candidate_id":f"eq.{pid}","limit":"1"}) or [])
        if not rr: continue
        r=rr[0]
        # Hard gate already encoded by the eligible view, but keep defensive check.
        try:
            if float(r.get("expected_commission_eur") or 0)<10: continue
        except Exception:
            continue
        r["discovery_context"]=(discovery.get(pid) or [])[:8]
        rows.append(r)
    # Pre-rank only to control LLM context; do NOT use commission as quality score.
    def pre_score(r):
        try: conf=float(r.get("intelligence_confidence") or 0)
        except: conf=0
        try: gap=float(r.get("greek_gap_confidence") or 0)
        except: gap=0
        sold=float(r.get("sold_count") or 0)
        facts=float(r.get("fact_count") or 0)
        return conf*45+gap*30+min(sold,1000)/1000*15+min(facts,20)/20*10
    rows.sort(key=pre_score,reverse=True)
    return rows[:cap]

SELECT_SYSTEM="""You are the Senior Product Selection Committee for a Greek proof-first commerce marketplace.
Demand is FROZEN. You are selecting products, not judging whether the pain exists.

From a broad AliExpress candidate pool choose ZERO TO THREE products for this ONE pain.
Three is a MAXIMUM, never a target.

Hard rules:
- Every chosen item must already pass the commercial eligibility gate (expected commission >= EUR 10). Do not rank by commission beyond that gate.
- Reject semantic mismatches even if they came from the right search query.
- Prefer exact problem-mechanism fit over keyword overlap.
- Prefer credible seller/listing evidence, observed sales, usable fulfillment evidence, and fewer critical evidence gaps.
- Consider Greek-market gap and likely user economics.
- Do not invent specs, reviews, warranty, certifications, delivery or superiority.
- If evidence is too weak, select fewer than 3 or zero.
- Avoid near-duplicate products. Prefer materially different value propositions/mechanisms/sellers.
- Maximum one candidate may be a speculative/high-ticket professional option unless the pain genuinely requires professional equipment.
- If three are justified, assign useful archetypes such as best_overall, best_value, professional, easiest_adoption, strongest_evidence. Do not force these labels.
- Explain what differentiates each selected product from the others.
- Explicitly identify major risks and missing evidence.

Return strict JSON:
{
 "pain_assessment":"...",
 "selection_count":0,
 "rejected_patterns":["..."],
 "selected":[
   {
    "product_candidate_id":"uuid",
    "offer_id":"uuid or null",
    "rank":1,
    "role":"BEST_FIT|BEST_VALUE|PRO",
    "reason":"...",
    "differentiation":"...",
    "strengths":["..."],
    "risks":["..."],
    "evidence_used":["..."],
    "confidence_0_100":80
   }
 ]
}
"""

def select(limit:int,cap:int):
    selected_total=0
    processed=0
    for topic in problems(limit):
        gap=latest_gap(topic["id"])
        pool=candidate_pool(topic["id"],cap)
        if not pool: continue
        out=ask(SELECT_SYSTEM,{"problem":topic,"frozen_gap":gap,"candidate_pool":pool})
        chosen=(out.get("selected") or [])[:3]
        valid_ids={x["product_candidate_id"]:x for x in pool}
        # Canonical marketplace contract: deactivate prior selections for this pain,
        # then write up to 3 new active selections.
        db_call("PATCH","ai_marketplace_selections",
          params={"problem_cluster_id":f"eq.{topic['id']}","active":"eq.true"},
          data={"active":False},prefer="return=minimal")
        rank=0
        used_roles=set()
        for x in chosen:
            pid=str(x.get("product_candidate_id") or "")
            if pid not in valid_ids: continue
            role=str(x.get("role") or "").upper()
            if role not in {"BEST_FIT","BEST_VALUE","PRO"}:
                role=("BEST_FIT" if rank==0 else "BEST_VALUE" if rank==1 else "PRO")
            if role in used_roles: continue
            rank+=1
            if rank>3: break
            used_roles.add(role)
            src=valid_ids[pid]
            rationale={
              "reason":x.get("reason"),
              "differentiation":x.get("differentiation"),
              "strengths":x.get("strengths") or [],
              "risks":x.get("risks") or [],
              "evidence_used":x.get("evidence_used") or [],
              "pain_assessment":out.get("pain_assessment"),
              "rejected_patterns":out.get("rejected_patterns") or [],
              "selection_version":"deep-ai-shortlist-v2"
            }
            db_call("POST","ai_marketplace_selections",
              params={"on_conflict":"problem_cluster_id,product_candidate_id,offer_id"},
              data={
                "market_code":"GR",
                "problem_cluster_id":topic["id"],
                "product_candidate_id":pid,
                "offer_id":src.get("offer_id"),
                "selection_role":role,
                "selection_rank":rank,
                "verdict":"SELECT",
                "confidence":float(x.get("confidence_0_100") or 0)/100,
                "rationale":rationale,
                "model_name":MODEL,
                "active":True
              },prefer="resolution=merge-duplicates,return=minimal")
            selected_total+=1
        processed+=1
        print(json.dumps({"event":"pain_shortlisted","problem_key":topic.get("problem_key"),"pool":len(pool),"selected":rank}))
    print(json.dumps({"event":"deep_shortlist_complete","problems_processed":processed,"selected_products":selected_total}))

def main():
    ap=argparse.ArgumentParser()
    sub=ap.add_subparsers(dest="cmd",required=True)
    p=sub.add_parser("plan");p.add_argument("--problems",type=int,default=100)
    s=sub.add_parser("select");s.add_argument("--problems",type=int,default=100);s.add_argument("--candidate-cap",type=int,default=30)
    a=ap.parse_args()
    if a.cmd=="plan": plan(a.problems)
    else: select(a.problems,a.candidate_cap)

if __name__=="__main__": main()
