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
from db_gateway import db_call
from direct_aliexpress import run_query

ENDPOINT="https://models.github.ai/inference/chat/completions"
TOKEN=os.getenv("GITHUB_TOKEN","")
MODEL=os.getenv("DEEP_RESEARCH_MODEL","openai/gpt-4.1")
TARGET_POOL=int(os.getenv("TARGET_ELIGIBLE_POOL_PER_PAIN","15"))
MAX_NEW_QUERIES=int(os.getenv("MAX_NEW_QUERIES_PER_PAIN","10"))
PAGES=int(os.getenv("DEEP_RESEARCH_PAGES","3"))

def ask(system:str,payload:Any)->dict[str,Any]:
    if not TOKEN: raise RuntimeError("GITHUB_TOKEN_missing")
    r=requests.post(ENDPOINT,headers={"Authorization":f"Bearer {TOKEN}","Content-Type":"application/json"},
      json={"model":MODEL,"temperature":0.08,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":system},{"role":"user","content":json.dumps(payload,ensure_ascii=False)}]},timeout=120)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])

def latest_gaps():
    rows=list(db_call("GET","ai_greek_gap_assessments",params={
      "select":"problem_cluster_id,conversion_opportunity,confidence,thesis,counter_thesis,assessed_at",
      "market_code":"eq.GR","order":"assessed_at.desc","limit":"200"}) or [])
    latest={}
    for r in rows:
        latest.setdefault(r["problem_cluster_id"],r)
    return latest

def problems():
    rows=list(db_call("GET","market_problem_clusters",params={
      "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory,pain_severity_score,purchase_urgency_score,willingness_to_pay_score",
      "market_code":"eq.GR","limit":"200"}) or [])
    return {r["id"]:r for r in rows}

def eligible_counts():
    rows=list(db_call("GET","ai_product_learning_v",params={
      "select":"problem_cluster_id,source_product_id","limit":"5000"}) or [])
    c=Counter()
    seen=set()
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
      "order":"last_eligible_count.desc.nullslast,last_result_count.desc.nullslast,priority.desc","limit":"80"}) or [])

SYSTEM="""You are a senior AliExpress retrieval researcher.
The Greek demand classification is frozen and must not be changed. Your job is only to discover physical products that could solve the supplied problem.

Use prior AliExpress result titles and query feedback to learn seller vocabulary.
Generate a DIVERSE search portfolio for the same pain, not near-duplicate queries.

Families:
- anchor: concrete product noun
- mechanism: physical technology/mechanism
- professional: technician/B2B terminology
- synonym: alternate marketplace nouns
- adjacent_solution: different physical mechanism solving same pain
- component: component/sensor/module when full system naming is rare

Rules:
- English AliExpress vocabulary only.
- 1-6 words preferred, max 8.
- No Greece, EU, shipping, reviews, seller, price, commission, discount.
- Do not encode quality filters.
- Do not repeat prior query text.
- Never drift into a neighboring problem merely because products are popular.
- Prefer exact solution nouns over generic electronics terms.
Return strict JSON:
{"queries":[{"query":"...","query_family":"anchor|mechanism|professional|synonym|adjacent_solution|component","hypothesis":"...","why":"..."}]}"""

def plan(problem:dict,gap:dict,hist:list[dict]):
    feedback=[]
    prior=set()
    for h in hist:
        q=" ".join(str(h.get("query_text") or "").split()).strip()
        if q: prior.add(q.lower())
        fb=h.get("agent_feedback") or {}
        feedback.append({
          "query":q,"family":h.get("query_family"),
          "results":h.get("last_result_count"),"eligible":h.get("last_eligible_count"),
          "samples":(fb.get("sample_results") or [])[:8]
        })
    out=ask(SYSTEM,{"problem":problem,"frozen_gap":gap,"prior_marketplace_feedback":feedback[:35]})
    fresh=[]
    for x in out.get("queries") or []:
        q=" ".join(str(x.get("query") or "").split()).strip()
        if not q or q.lower() in prior: continue
        if len(q.split())>8: q=" ".join(q.split()[:8])
        if q.lower() in {z["query"].lower() for z in fresh}: continue
        fresh.append({**x,"query":q})
        if len(fresh)>=MAX_NEW_QUERIES: break
    return fresh

def insert_query(problem_id:str,x:dict,priority:int):
    rows=db_call("POST","ai_source_queries",
      params={"on_conflict":"market_code,source_key,query_text","select":"id,query_text,problem_cluster_id,hypothesis,priority,query_family,consecutive_zero_runs,agent_feedback"},
      data={"market_code":"GR","source_key":"aliexpress","query_text":x["query"],
            "problem_cluster_id":problem_id,"hypothesis":x,
            "query_family":"deep_"+str(x.get("query_family") or "agentic"),
            "priority":priority,"status":"active",
            "agent_feedback":{"generation":"deep_gap_research_v1","frozen_demand":True,"planner_model":MODEL}},
      prefer="resolution=merge-duplicates,return=representation")
    return rows[0] if rows else None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--max-pains",type=int,default=30)
    ap.add_argument("--target-pool",type=int,default=TARGET_POOL)
    ap.add_argument("--pages",type=int,default=PAGES)
    args=ap.parse_args()

    gaps=latest_gaps(); probs=problems(); counts=eligible_counts()
    targets=[]
    for pid,g in gaps.items():
        opp=str(g.get("conversion_opportunity") or "").upper()
        if opp not in ("PROMISING","TEST"): continue
        if pid not in probs: continue
        n=counts.get(pid,0)
        if n < args.target_pool:
            targets.append((0 if opp=="PROMISING" else 1,n,-float(g.get("confidence") or 0),pid,g))
    targets.sort()
    targets=targets[:args.max_pains]

    totals={"pains":len(targets),"queries":0,"seen":0,"stored":0,"eligible":0}
    for _,before,_,pid,gap in targets:
        problem=probs[pid]; hist=history(pid)
        try:
            qs=plan(problem,gap,hist)
        except Exception as exc:
            print(json.dumps({"event":"planner_error","problem_key":problem["problem_key"],"error":str(exc)[:400]}))
            continue
        print(json.dumps({"event":"deep_plan","problem_key":problem["problem_key"],"pool_before":before,"queries":[x["query"] for x in qs]}))
        for i,x in enumerate(qs):
            row=insert_query(pid,x,180-i)
            if not row: continue
            totals["queries"]+=1
            try:
                st=run_query(row,max(1,args.pages))
                totals["seen"]+=st["seen"];totals["stored"]+=st["stored"];totals["eligible"]+=st["promotion_eligible"]
            except Exception as exc:
                print(json.dumps({"event":"deep_query_error","problem_key":problem["problem_key"],"query":x["query"],"error":str(exc)[:400]}))
    print(json.dumps({"event":"deep_gap_research_complete",**totals}))

if __name__=="__main__": main()
