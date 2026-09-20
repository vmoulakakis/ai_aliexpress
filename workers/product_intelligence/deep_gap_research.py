#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,math,os,sys
from collections import Counter,defaultdict
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
MIN_CATEGORY_ELIGIBLE=int(os.getenv("MIN_CATEGORY_ELIGIBLE","10"))

def ai_json(system:str,payload:Any)->dict[str,Any]:
    token=_oidc_token()
    r=requests.post(AI_RESEARCH_GATEWAY,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"},
      json={"system":system,"payload":payload,"max_tokens":3600},timeout=220)
    r.raise_for_status()
    body=r.json()
    if not body.get("ok"): raise RuntimeError(body)
    return body.get("data") or {}

def allocations():
    return list(db_call("GET","ai_demand_allocation_v",params={
      "select":"problem_cluster_id,problem_key,problem_title,category,subcategory,target_customer,pain_severity_score,purchase_urgency_score,willingness_to_pay_score,demand_state,buyer_intent_state,supply_state,competition_state,conversion_opportunity,gap_confidence,demand_score,research_priority_score,winner_cap,candidate_pool_target,query_budget,page_budget",
      "winner_cap":"gt.0","order":"research_priority_score.desc","limit":"200"}) or [])

def eligible_inventory(alloc:list[dict]):
    rows=list(db_call("GET","ai_product_learning_v",params={"select":"problem_cluster_id,source_product_id","limit":"5000"}) or [])
    p2cat={a["problem_cluster_id"]:a.get("category") or "Unknown" for a in alloc}
    pain=Counter();category=Counter();seen=set()
    for r in rows:
        pid=r.get("problem_cluster_id");sid=r.get("source_product_id")
        k=(pid,sid)
        if not pid or not sid or k in seen: continue
        seen.add(k);pain[pid]+=1;category[p2cat.get(pid,"Unknown")]+=1
    return pain,category

def history(problem_id:str):
    return list(db_call("GET","ai_source_queries",params={
      "select":"id,query_text,query_family,last_result_count,last_eligible_count,agent_feedback,hypothesis,priority",
      "problem_cluster_id":f"eq.{problem_id}","status":"eq.active",
      "order":"last_eligible_count.desc.nullslast,last_result_count.desc.nullslast,priority.desc","limit":"120"}) or [])

SYSTEM="""You are the AliExpress Deep Retrieval Planner for a Greek proof-commerce marketplace.
The supplied Greek demand allocation is FROZEN evidence. Do not re-score demand.
Your task is to broaden AliExpress discovery for the SAME pain until its demand category has enough commercially eligible solution candidates.

Generate a diverse search portfolio across:
- exact product nouns
- alternative physical mechanisms that solve the same pain
- professional/B2B terminology
- marketplace synonyms
- OEM/rebrand terminology
- component/system terminology
- adjacent solution mechanisms that still directly solve the supplied pain

Rules:
- English AliExpress search language.
- Prefer 1-6 words, maximum 8.
- No Greece/EU/shipping/reviews/seller/price/commission/discount words.
- Do not encode quality filters in the search phrase.
- Never drift into a neighboring problem.
- Avoid prior queries and low-yield phrase patterns.
- If the category is below its minimum inventory target, maximize recall and mechanism diversity while preserving pain relevance.
Return JSON only:
{"queries":[{"query":"...","query_family":"anchor|mechanism|professional|synonym|oem_rebrand|adjacent_solution|component","hypothesis":"...","why":"..."}]}"""

def plan(a:dict,hist:list[dict],budget:int,category_before:int):
    prior=set();feedback=[]
    for h in hist:
        q=" ".join(str(h.get("query_text") or "").split()).strip()
        if q: prior.add(q.lower())
        fb=h.get("agent_feedback") or {}
        feedback.append({"query":q,"family":h.get("query_family"),"results":h.get("last_result_count"),
                         "eligible":h.get("last_eligible_count"),"samples":(fb.get("sample_results") or [])[:6]})
    out=ai_json(SYSTEM,{
      "demand_allocation":a,
      "category_inventory":{"category":a.get("category"),"eligible_now":category_before,"minimum_required":MIN_CATEGORY_ELIGIBLE,
                            "shortfall":max(0,MIN_CATEGORY_ELIGIBLE-category_before)},
      "prior_marketplace_feedback":feedback[:60],
      "query_budget":budget})
    fresh=[]
    for x in out.get("queries") or []:
        q=" ".join(str(x.get("query") or "").split()).strip()
        if not q or q.lower() in prior: continue
        if len(q.split())>8:q=" ".join(q.split()[:8])
        if q.lower() in {z["query"].lower() for z in fresh}:continue
        fresh.append({**x,"query":q})
        if len(fresh)>=budget:break
    return fresh

def insert_query(problem_id:str,x:dict,priority:int,a:dict,category_before:int):
    rows=db_call("POST","ai_source_queries",
      params={"on_conflict":"market_code,source_key,query_text","select":"id,query_text,problem_cluster_id,hypothesis,priority,query_family,consecutive_zero_runs,agent_feedback"},
      data={"market_code":"GR","source_key":"aliexpress","query_text":x["query"],"problem_cluster_id":problem_id,
            "hypothesis":x,"query_family":"deep_"+str(x.get("query_family") or "agentic"),
            "priority":priority,"status":"active",
            "agent_feedback":{"generation":"category-min10-deep-research-v3","frozen_demand":True,
              "category":a.get("category"),"category_eligible_before":category_before,"category_minimum":MIN_CATEGORY_ELIGIBLE,
              "demand_score":a.get("demand_score"),"research_priority_score":a.get("research_priority_score"),
              "winner_cap":a.get("winner_cap"),"candidate_pool_target":a.get("candidate_pool_target"),"planner_model":MODEL}},
      prefer="resolution=merge-duplicates,return=representation")
    return rows[0] if rows else None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--max-pains",type=int,default=MAX_TOTAL_PAINS)
    ap.add_argument("--target-pool",type=int,default=0)
    ap.add_argument("--pages",type=int,default=0)
    args=ap.parse_args()

    alloc=allocations();pain_counts,cat_counts=eligible_inventory(alloc)
    by_cat=defaultdict(list)
    for a in alloc:by_cat[a.get("category") or "Unknown"].append(a)

    targets=[]
    for a in alloc:
        cat=a.get("category") or "Unknown"
        before=pain_counts.get(a["problem_cluster_id"],0)
        cat_before=cat_counts.get(cat,0)
        sparse=cat_before<MIN_CATEGORY_ELIGIBLE
        normal_target=args.target_pool or int(a.get("candidate_pool_target") or 8)
        if sparse:
            share=max(2,math.ceil((MIN_CATEGORY_ELIGIBLE-cat_before)/max(1,len(by_cat[cat]))))
            target=max(normal_target,before+share)
        else:
            target=normal_target
        if sparse or before<target:
            priority=float(a.get("research_priority_score") or 0)+(100 if sparse else 0)+(MIN_CATEGORY_ELIGIBLE-cat_before if sparse else 0)
            targets.append((priority,before,target,cat_before,a))
    targets.sort(key=lambda x:(-x[0],x[1]))
    targets=targets[:max(1,args.max_pains)]

    totals={"pains":len(targets),"queries":0,"seen":0,"stored":0,"eligible":0}
    category_stats=Counter();subcategory_stats=Counter()
    for _,before,target,cat_before,a in targets:
        pid=a["problem_cluster_id"];hist=history(pid)
        sparse=cat_before<MIN_CATEGORY_ELIGIBLE
        base_budget=max(1,int(a.get("query_budget") or 4))
        budget=max(base_budget,14 if sparse else base_budget)
        base_pages=max(1,int(a.get("page_budget") or 1))
        pages=args.pages or max(base_pages,4 if sparse else base_pages)
        try:qs=plan(a,hist,budget,cat_before)
        except Exception as exc:
            print(json.dumps({"event":"planner_error","problem_key":a["problem_key"],"error":str(exc)[:400]}));continue
        print(json.dumps({"event":"category_min10_plan","problem_key":a["problem_key"],"category":a.get("category"),
          "subcategory":a.get("subcategory"),"category_eligible_before":cat_before,"category_minimum":MIN_CATEGORY_ELIGIBLE,
          "demand_score":a.get("demand_score"),"pool_before":before,"pool_target":target,"pages":pages,
          "queries":[x["query"] for x in qs]}))
        for i,x in enumerate(qs):
            row=insert_query(pid,x,300-i,a,cat_before)
            if not row:continue
            totals["queries"]+=1
            try:
                st=run_query(row,pages)
                totals["seen"]+=st["seen"];totals["stored"]+=st["stored"];totals["eligible"]+=st["promotion_eligible"]
            except Exception as exc:
                print(json.dumps({"event":"deep_query_error","problem_key":a["problem_key"],"query":x["query"],"error":str(exc)[:400]}))
        category_stats[str(a.get("category") or "Unknown")]+=1
        subcategory_stats[f'{a.get("category")} / {a.get("subcategory")}']+=1
    print(json.dumps({"event":"category_min10_research_complete",**totals,
      "category_eligible_before":dict(cat_counts),"categories_researched":dict(category_stats),
      "subcategories_researched":dict(subcategory_stats)},ensure_ascii=False))

if __name__=="__main__":main()
