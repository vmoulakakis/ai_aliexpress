#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,os,sys,time,uuid
from datetime import datetime,timezone
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
sys.path.insert(0,str(ROOT/"workers"/"product_intelligence"))
from db_gateway import db_call
import direct_aliexpress

ENDPOINT="https://models.github.ai/inference/chat/completions"
TOKEN=os.getenv("GITHUB_TOKEN","")
MODEL=os.getenv("DEEP_RESEARCH_MODEL","openai/gpt-4.1")
MARKET="GR"

def ask(system:str,payload:Any)->dict[str,Any]:
    if not TOKEN: raise RuntimeError("GITHUB_TOKEN_missing")
    r=requests.post(ENDPOINT,headers={"Authorization":f"Bearer {TOKEN}","Content-Type":"application/json"},
      json={"model":MODEL,"temperature":0.10,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":system},{"role":"user","content":json.dumps(payload,ensure_ascii=False)}]},timeout=180)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])

def load_pains(opportunities:list[str],limit:int):
    vals=",".join(opportunities)
    rows=list(db_call("GET","ai_greek_gap_assessments",params={
      "select":"problem_cluster_id,conversion_opportunity,confidence,thesis,counter_thesis,demand_state,pain_state,supply_state,competition_state,buyer_intent_state,assessed_at",
      "market_code":"eq.GR","conversion_opportunity":f"in.({vals})",
      "order":"confidence.desc,assessed_at.desc","limit":"100"}) or [])
    latest={}
    for r in rows:
      latest.setdefault(r["problem_cluster_id"],r)
    out=[]
    for pid,gap in latest.items():
      cluster=list(db_call("GET","market_problem_clusters",params={
        "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory,evidence_summary",
        "id":f"eq.{pid}","limit":"1"}) or [])
      if cluster: out.append({"cluster":cluster[0],"gap":gap})
    return out[:limit]

def prior_feedback(pid:str):
    return list(db_call("GET","ai_source_queries",params={
      "select":"query_text,query_family,last_result_count,last_eligible_count,consecutive_zero_runs,agent_feedback",
      "problem_cluster_id":f"eq.{pid}","order":"last_run_at.desc.nullslast,priority.desc","limit":"100"}) or [])

def make_queries(ctx:dict[str,Any],target:int):
    history=prior_feedback(ctx["cluster"]["id"])
    samples=[]
    for h in history:
      fb=h.get("agent_feedback") or {}
      samples.append({
        "query":h.get("query_text"),"family":h.get("query_family"),
        "results":h.get("last_result_count"),"eligible":h.get("last_eligible_count"),
        "zero_runs":h.get("consecutive_zero_runs"),
        "sample_titles":[x.get("title") for x in (fb.get("sample_results") or [])[:8] if x.get("title")]
      })
    out=ask("""You are the Deep AliExpress Retrieval Agent for a Greek commerce engine.
The Greek demand/gap assessment is FROZEN. Do not rejudge it. Your only job is broad, intelligent product discovery for the exact physical pain.

Generate a DIVERSE AliExpress search portfolio. We want many candidate products and multiple solution mechanisms, not 3 near-duplicate listings.

Required query families:
- exact_product_noun
- mechanism
- professional_term
- seller_vocabulary
- synonym
- adjacent_mechanism
- system_or_kit
- sensor_or_component
- diagnostic_tool
- prevention_tool

Rules:
- Use concrete English marketplace nouns sellers actually use.
- 2-6 words preferred, max 8.
- Learn from prior returned titles and zero-result queries.
- Never add Greece, EU, cheap, best, reviews, commission, seller rating or shipping terms.
- Do not optimize for price or commission at retrieval stage.
- Explore genuinely different product mechanisms that can solve the SAME pain.
- Avoid accessories unless the accessory itself solves the pain.
- Return enough distinct queries to reach the requested target.

Return strict JSON:
{"strategy":"...","queries":[{"query":"...","family":"...","mechanism":"...","why":"..."}]}""",
      {"pain":ctx,"prior_marketplace_feedback":samples,"target_query_count":target})
    seen=set(); qs=[]
    for x in out.get("queries") or []:
      q=" ".join(str(x.get("query") or "").split()).strip()
      if not q or q.lower() in seen: continue
      seen.add(q.lower())
      qs.append({**x,"query":" ".join(q.split()[:8])})
      if len(qs)>=target: break
    return out.get("strategy"),qs

def persist_query(ctx,q:dict[str,Any],idx:int):
    db_call("POST","ai_source_queries",
      params={"on_conflict":"market_code,source_key,query_text"},
      data={"market_code":"GR","source_key":"aliexpress","query_text":q["query"],
            "problem_cluster_id":ctx["cluster"]["id"],
            "query_family":str(q.get("family") or "deep_research"),
            "hypothesis":{"mechanism":q.get("mechanism"),"reason":q.get("why"),"deep_research":True},
            "priority":180-idx,"status":"active",
            "agent_feedback":{"generation":"deep_gap_research_v1","frozen_demand":True}},
      prefer="resolution=merge-duplicates,return=minimal")
    rows=list(db_call("GET","ai_source_queries",params={
      "select":"id,query_text,problem_cluster_id,hypothesis,priority,query_family,consecutive_zero_runs,agent_feedback",
      "market_code":"eq.GR","source_key":"eq.aliexpress","query_text":f"eq.{q['query']}","limit":"1"}) or [])
    return rows[0] if rows else None

def candidate_pool(pid:str,limit:int):
    rows=list(db_call("GET","ai_product_learning_v",params={
      "select":"product_candidate_id,offer_id,source_product_id,title,category,price_eur,expected_commission_eur,commission_rate,promotion_url,problem_cluster_id,problem_key,problem_title,target_customer,greek_gap_opportunity,greek_gap_confidence,sold_count,seller_source_id,product_identity,pain_feature_map,winning_factors,dealbreakers,pros,cons,seller_quality,fulfillment_analysis,price_value_analysis,greek_fit_analysis,conversion_analysis,evidence_gaps,intelligence_confidence,fact_count,media_count,review_count,spec_count,data_completeness",
      "problem_cluster_id":f"eq.{pid}",
      "order":"intelligence_confidence.desc.nullslast,expected_commission_eur.desc.nullslast",
      "limit":str(limit)}) or [])
    return rows

def compact_candidate(p:dict[str,Any]):
    return {
      "product_candidate_id":p.get("product_candidate_id"),"offer_id":p.get("offer_id"),
      "source_product_id":p.get("source_product_id"),"title":p.get("title"),"category":p.get("category"),
      "price_eur":p.get("price_eur"),"expected_commission_eur":p.get("expected_commission_eur"),
      "sold_count":p.get("sold_count"),"seller_source_id":p.get("seller_source_id"),
      "seller_quality":p.get("seller_quality"),"fulfillment":p.get("fulfillment_analysis"),
      "pain_feature_map":p.get("pain_feature_map"),"winning_factors":p.get("winning_factors"),
      "dealbreakers":p.get("dealbreakers"),"evidence_gaps":p.get("evidence_gaps"),
      "intelligence_confidence":p.get("intelligence_confidence"),"fact_count":p.get("fact_count"),
      "review_count":p.get("review_count"),"spec_count":p.get("spec_count")
    }

def shortlist(ctx:dict[str,Any],pool:list[dict[str,Any]],run_id:str):
    if not pool: return []
    out=ask("""You are the final Product Portfolio Selector for one FROZEN Greek pain-gap.
You receive many AliExpress candidates discovered through broad research.

Your task is NOT to maximize commission. Select ZERO TO THREE products maximum for publication.

NON-NEGOTIABLE:
1. PRODUCT-PROBLEM FIT comes first. Reject semantic accidents and query contamination.
   Example: a dashcam returned for a vibration-sensor query is NOT a bearing-failure solution.
2. The product title/category/mechanism must plausibly solve the supplied pain.
3. If exact mechanism/spec proof is missing, reduce confidence; do not invent it.
4. Commission >= EUR 10 is already the deterministic commercial gate. Do not add hard thresholds for seller, sales, warehouse, reviews, price, shipping or trust.
5. Evaluate those factors holistically as evidence/trade-offs.
6. Prefer distinct solution roles/mechanisms. Do not publish three near-identical clones just because all are eligible.
7. At most one product per role:
   - best_overall = strongest total fit/evidence
   - best_value = lower-cost credible option, only if genuinely credible
   - pro_choice = more capable/professional option, only if evidence supports it
8. You may select only 1 or 2, or ZERO, when quality is insufficient.
9. Explicitly reject accessories, irrelevant products and weak semantic matches.
10. Greek gap classification remains frozen and must not be rewritten.

Judge:
- exact semantic/mechanism fit
- differentiation from other selected products
- seller/listing evidence
- observed sales as one signal, never a hard rule
- fulfillment uncertainty
- price/value relative to likely target customer
- evidence completeness
- likely Greek conversion friction
- missing reviews/specs/warranty
- commission economics only after fit

Return strict JSON:
{
 "portfolio_thesis":"...",
 "rejected_patterns":["..."],
 "selections":[
   {
    "product_candidate_id":"uuid",
    "offer_id":"uuid",
    "role":"best_overall|best_value|pro_choice",
    "rank":1,
    "confidence_0_100":0,
    "product_problem_fit_0_100":0,
    "differentiation_0_100":0,
    "selection_thesis":"...",
    "rejection_risks":["..."],
    "evidence":["..."]
   }
 ]
}
Ranks must be unique 1..3 and roles unique.""",
      {"pain":ctx,"candidate_count":len(pool),"candidates":[compact_candidate(x) for x in pool]})
    sels=[]
    seen_products=set();seen_roles=set();seen_ranks=set()
    valid_ids={str(x["product_candidate_id"]):(x) for x in pool}
    for s in out.get("selections") or []:
      pid=str(s.get("product_candidate_id") or "")
      role=str(s.get("role") or "")
      rank=int(s.get("rank") or 0)
      if pid not in valid_ids or pid in seen_products or role in seen_roles or rank in seen_ranks: continue
      if role not in ("best_overall","best_value","pro_choice") or rank not in (1,2,3): continue
      seen_products.add(pid);seen_roles.add(role);seen_ranks.add(rank)
      p=valid_ids[pid]
      sels.append({**s,"offer_id":s.get("offer_id") or p.get("offer_id")})
      if len(sels)>=3: break
    sels.sort(key=lambda x:int(x["rank"]))
    db_call("DELETE","ai_gap_product_shortlist",params={"problem_cluster_id":f"eq.{ctx['cluster']['id']}"})
    now=datetime.now(timezone.utc).isoformat()
    for s in sels:
      db_call("POST","ai_gap_product_shortlist",data={
        "problem_cluster_id":ctx["cluster"]["id"],
        "product_candidate_id":s["product_candidate_id"],
        "offer_id":s.get("offer_id"),
        "selection_role":s["role"],"rank":int(s["rank"]),"verdict":"SELECTED",
        "confidence":float(s.get("confidence_0_100") or 0)/100,
        "product_problem_fit":float(s.get("product_problem_fit_0_100") or 0)/100,
        "differentiation_score":float(s.get("differentiation_0_100") or 0)/100,
        "selection_thesis":s.get("selection_thesis"),
        "rejection_risks":s.get("rejection_risks") or [],
        "evidence":{"items":s.get("evidence") or [],"portfolio_thesis":out.get("portfolio_thesis"),"rejected_patterns":out.get("rejected_patterns") or []},
        "model_name":MODEL,"research_run_id":run_id,"selected_at":now,"updated_at":now
      },prefer="return=minimal")
    return sels

def run_one(ctx,args,run_id):
    strategy,queries=make_queries(ctx,args.queries_per_pain)
    stats={"pain":ctx["cluster"]["problem_key"],"queries":len(queries),"seen":0,"stored":0,"eligible":0}
    for i,q in enumerate(queries):
      row=persist_query(ctx,q,i)
      if not row: continue
      st=direct_aliexpress.run_query(row,args.pages)
      stats["seen"]+=st["seen"];stats["stored"]+=st["stored"];stats["eligible"]+=st["promotion_eligible"]
      time.sleep(.15)
    pool=candidate_pool(ctx["cluster"]["id"],args.max_candidates)
    sels=shortlist(ctx,pool,run_id)
    stats.update({"pool":len(pool),"selected":len(sels),"strategy":strategy,
                  "selections":[{"id":s["product_candidate_id"],"role":s["role"],"fit":s.get("product_problem_fit_0_100")} for s in sels]})
    print(json.dumps({"event":"pain_deep_research_complete",**stats},ensure_ascii=False))
    return stats

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--opportunities",default="PROMISING,TEST")
    ap.add_argument("--max-pains",type=int,default=30)
    ap.add_argument("--queries-per-pain",type=int,default=20)
    ap.add_argument("--pages",type=int,default=3)
    ap.add_argument("--max-candidates",type=int,default=80)
    args=ap.parse_args()
    run_id=f"deep-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
    pains=load_pains([x.strip().upper() for x in args.opportunities.split(",") if x.strip()],args.max_pains)
    totals={"pains":len(pains),"seen":0,"stored":0,"eligible":0,"selected":0}
    for ctx in pains:
      try:
        st=run_one(ctx,args,run_id)
        for k in ("seen","stored","eligible","selected"): totals[k]+=int(st.get(k) or 0)
      except Exception as e:
        print(json.dumps({"event":"pain_deep_research_error","pain":ctx["cluster"].get("problem_key"),"error":str(e)[:1000]}))
    print(json.dumps({"event":"deep_gap_research_complete","run_id":run_id,**totals}))
if __name__=="__main__": main()
