#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,os,sys
from collections import Counter
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
sys.path.insert(0,str(ROOT/"workers"/"product_intelligence"))
from db_gateway import db_call,_oidc_token
from direct_aliexpress import run_query

AI_RESEARCH_GATEWAY=os.getenv("AI_RESEARCH_GATEWAY","https://travel-ai-lovat-psi.vercel.app/api/internal/ai-aliexpress-research")
MODEL=os.getenv("DEEP_RESEARCH_MODEL","deepseek-v4-pro")
MAX_TOTAL_PAINS=int(os.getenv("MAX_TOTAL_PAINS_PER_RUN","60"))

def ai_json(system:str,payload:Any)->dict[str,Any]:
    token=_oidc_token()
    r=requests.post(AI_RESEARCH_GATEWAY,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"},
      json={"system":system,"payload":payload,"max_tokens":3200},timeout=220)
    r.raise_for_status()
    body=r.json()
    if not body.get("ok"): raise RuntimeError(body)
    return body.get("data") or {}

def allocations():
    return list(db_call("GET","ai_demand_allocation_v",params={
      "select":"problem_cluster_id,problem_key,problem_title,category,subcategory,target_customer,pain_severity_score,purchase_urgency_score,willingness_to_pay_score,demand_state,buyer_intent_state,supply_state,competition_state,conversion_opportunity,gap_confidence,demand_score,research_priority_score,winner_cap,candidate_pool_target,query_budget,page_budget",
      "winner_cap":"gt.0","order":"research_priority_score.desc","limit":"200"}) or [])

def eligible_counts():
    rows=list(db_call("GET","ai_product_learning_v",params={"select":"problem_cluster_id,source_product_id","limit":"5000"}) or [])
    c=Counter();seen=set()
    for r in rows:
        k=(r.get("problem_cluster_id"),r.get("source_product_id"))
        if k in seen: continue
        seen.add(k)
        if k[0]: c[k[0]]+=1
    return c

def history(problem_id:str):
    return list(db_call("GET","ai_source_queries",params={
      "select":"id,query_text,query_family,last_result_count,last_eligible_count,agent_feedback,hypothesis,priority",
      "problem_cluster_id":f"eq.{problem_id}","status":"eq.active",
      "order":"last_eligible_count.desc.nullslast,last_result_count.desc.nullslast,priority.desc","limit":"100"}) or [])

SYSTEM="""You are the AliExpress Deep Retrieval Planner for a Greek proof-commerce marketplace.
The supplied Greek demand allocation is FROZEN evidence. Do not re-score demand.
Your only job is to broaden product discovery for the SAME pain.

Generate a diverse AliExpress vocabulary portfolio across:
anchor product nouns, technical mechanism, professional/B2B terminology, marketplace synonyms,
OEM/rebrand language, adjacent physical mechanisms, and useful component/system terms.

Rules:
- English AliExpress search language.
- Prefer 1-6 words, maximum 8.
- No Greece/EU/shipping/reviews/seller/price/commission/discount words.
- Do not encode quality filters.
- Never drift into a neighboring problem.
- Avoid repeating prior queries.
- Seek materially different solution mechanisms, not cosmetic variants.
Return JSON only:
{"queries":[{"query":"...","query_family":"anchor|mechanism|professional|synonym|oem_rebrand|adjacent_solution|component","hypothesis":"...","why":"..."}]}"""

def plan(a:dict,hist:list[dict],budget:int):
    prior=set();feedback=[]
    for h in hist:
        q=" ".join(str(h.get("query_text") or "").split()).strip()
        if q: prior.add(q.lower())
        fb=h.get("agent_feedback") or {}
        feedback.append({"query":q,"family":h.get("query_family"),"results":h.get("last_result_count"),
                         "eligible":h.get("last_eligible_count"),"samples":(fb.get("sample_results") or [])[:6]})
    out=ai_json(SYSTEM,{"demand_allocation":a,"prior_marketplace_feedback":feedback[:45],"query_budget":budget})
    fresh=[]
    for x in out.get("queries") or []:
        q=" ".join(str(x.get("query") or "").split()).strip()
        if not q or q.lower() in prior: continue
        if len(q.split())>8:q=" ".join(q.split()[:8])
        if q.lower() in {z["query"].lower() for z in fresh}:continue
        fresh.append({**x,"query":q})
        if len(fresh)>=budget:break
    return fresh

def insert_query(problem_id:str,x:dict,priority:int,a:dict):
    rows=db_call("POST","ai_source_queries",
      params={"on_conflict":"market_code,source_key,query_text","select":"id,query_text,problem_cluster_id,hypothesis,priority,query_family,consecutive_zero_runs,agent_feedback"},
      data={"market_code":"GR","source_key":"aliexpress","query_text":x["query"],"problem_cluster_id":problem_id,
            "hypothesis":x,"query_family":"deep_"+str(x.get("query_family") or "agentic"),
            "priority":priority,"status":"active",
            "agent_feedback":{"generation":"demand_adaptive_deep_research_v2","frozen_demand":True,
              "demand_score":a.get("demand_score"),"research_priority_score":a.get("research_priority_score"),
              "winner_cap":a.get("winner_cap"),"candidate_pool_target":a.get("candidate_pool_target"),"planner_model":MODEL}},
      prefer="resolution=merge-duplicates,return=representation")
    return rows[0] if rows else None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--max-pains",type=int,default=MAX_TOTAL_PAINS)
    ap.add_argument("--target-pool",type=int,default=0,help="optional diagnostic override; 0 keeps AI-demand allocation")
    ap.add_argument("--pages",type=int,default=0,help="optional diagnostic override; 0 keeps AI-demand allocation")
    args=ap.parse_args()

    alloc=allocations();counts=eligible_counts()
    targets=[]
    for a in alloc:
        before=counts.get(a["problem_cluster_id"],0)
        target=args.target_pool or int(a.get("candidate_pool_target") or 8)
        if before<target:
            targets.append((float(a.get("research_priority_score") or 0),before,target,a))
    targets.sort(key=lambda x:(-x[0],x[1]))
    targets=targets[:max(1,args.max_pains)]

    totals={"pains":len(targets),"queries":0,"seen":0,"stored":0,"eligible":0}
    category_stats=Counter();subcategory_stats=Counter()
    for _,before,target,a in targets:
        pid=a["problem_cluster_id"];hist=history(pid)
        budget=max(1,int(a.get("query_budget") or 4))
        pages=args.pages or max(1,int(a.get("page_budget") or 1))
        try:qs=plan(a,hist,budget)
        except Exception as exc:
            print(json.dumps({"event":"planner_error","problem_key":a["problem_key"],"error":str(exc)[:400]}));continue
        print(json.dumps({"event":"demand_adaptive_plan","problem_key":a["problem_key"],"category":a.get("category"),
          "subcategory":a.get("subcategory"),"demand_score":a.get("demand_score"),"winner_cap":a.get("winner_cap"),
          "pool_before":before,"pool_target":target,"queries":[x["query"] for x in qs]}))
        for i,x in enumerate(qs):
            row=insert_query(pid,x,200-i,a)
            if not row:continue
            totals["queries"]+=1
            try:
                st=run_query(row,pages)
                totals["seen"]+=st["seen"];totals["stored"]+=st["stored"];totals["eligible"]+=st["promotion_eligible"]
            except Exception as exc:
                print(json.dumps({"event":"deep_query_error","problem_key":a["problem_key"],"query":x["query"],"error":str(exc)[:400]}))
        category_stats[str(a.get("category") or "Unknown")]+=1
        subcategory_stats[f'{a.get("category")} / {a.get("subcategory")}']+=1
    print(json.dumps({"event":"demand_adaptive_research_complete",**totals,
      "categories_researched":dict(category_stats),"subcategories_researched":dict(subcategory_stats)},ensure_ascii=False))

if __name__=="__main__":main()
