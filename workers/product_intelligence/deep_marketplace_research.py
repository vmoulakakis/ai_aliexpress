#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os, sys, time
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
sys.path.insert(0,str(ROOT/"workers"/"product_intelligence"))
from db_gateway import db_call
from direct_aliexpress import call_api, upsert_product, upsert_offer, upsert_discovery

ENDPOINT="https://models.github.ai/inference/chat/completions"
TOKEN=os.getenv("GITHUB_TOKEN","")
MODEL=os.getenv("DEEP_RESEARCH_MODEL","openai/gpt-4.1")
MARKET=os.getenv("MARKET_CODE","GR")
PAGE_SIZE=min(50,max(20,int(os.getenv("ALIEXPRESS_PAGE_SIZE","40"))))
TIMEOUT=120

def ask(system:str,payload:Any)->dict[str,Any]:
    if not TOKEN: raise RuntimeError("GITHUB_TOKEN_missing")
    r=requests.post(ENDPOINT,headers={"Authorization":f"Bearer {TOKEN}","Content-Type":"application/json"},
      json={"model":MODEL,"temperature":0.08,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":system},{"role":"user","content":json.dumps(payload,ensure_ascii=False)}]},timeout=TIMEOUT)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])

def latest_gaps():
    return list(db_call("GET","ai_greek_gap_assessments",params={
      "select":"problem_cluster_id,lifecycle,demand_state,pain_state,supply_state,competition_state,exact_match_state,substitute_state,price_gap_state,buyer_intent_state,conversion_opportunity,confidence,thesis,counter_thesis,assessed_at",
      "market_code":"eq.GR","order":"assessed_at.desc","limit":"200"}) or [])

def problem(pid:str):
    x=list(db_call("GET","market_problem_clusters",params={
      "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory",
      "id":f"eq.{pid}","limit":"1"}) or [])
    return x[0] if x else None

def query_history(pid:str):
    return list(db_call("GET","ai_source_queries",params={
      "select":"id,query_text,query_family,last_result_count,last_eligible_count,agent_feedback",
      "problem_cluster_id":f"eq.{pid}","status":"eq.active","order":"priority.desc","limit":"20"}) or [])

def ensure_query(pid:str,q:str,family:str,hypothesis:str,priority:int):
    rows=db_call("POST","ai_source_queries",
      params={"on_conflict":"market_code,source_key,query_text","select":"id,query_text,query_family,problem_cluster_id,agent_feedback"},
      data={"market_code":"GR","source_key":"aliexpress","query_text":q,"problem_cluster_id":pid,
            "hypothesis":{"hypothesis":hypothesis,"origin":"deep_marketplace_research_v1"},
            "query_family":family,"priority":priority,"status":"active",
            "agent_feedback":{"generation":"deep_marketplace_research_v1","demand_frozen":True}},
      prefer="resolution=merge-duplicates,return=representation")
    return rows[0] if rows else None

def expand_queries(p:dict,gap:dict,history:list[dict]):
    samples=[]
    for h in history:
      fb=h.get("agent_feedback") or {}
      samples.extend((fb.get("sample_results") or [])[:5])
    out=ask("""You are a senior AliExpress Product Retrieval Agent.
Demand Intelligence is FROZEN. Do not reassess demand and do not change the Greek pain thesis.
Your only job is to search AliExpress much more deeply for physical products that could solve this exact pain.

Generate a diverse retrieval portfolio, not cosmetic keyword variants.
Cover:
- exact product nouns
- underlying mechanism/technology
- professional/B2B vocabulary
- marketplace synonyms
- adjacent physical mechanisms solving the same pain
- system/component names sellers actually use

Learn from prior AliExpress result titles. Reject vocabulary that produced unrelated categories.
Prefer 2-6 word English marketplace queries, max 8 words.
Never add Greece, review, price, commission, shipping, seller, warehouse, rating.
Return JSON:
{"queries":[{"query":"...","family":"exact|mechanism|professional|synonym|adjacent|component","hypothesis":"..."}]}
Return 8-12 queries maximum.""",
      {"problem":p,"frozen_gap":gap,"existing_queries":[h.get("query_text") for h in history],"sample_titles":samples[:30]})
    clean=[]; seen=set()
    for x in out.get("queries") or []:
      q=" ".join(str(x.get("query") or "").split()).strip()
      if not q or len(q.split())>8 or q.lower() in seen: continue
      seen.add(q.lower()); clean.append({"query":q,"family":x.get("family") or "deep","hypothesis":x.get("hypothesis") or ""})
    return clean[:12]

def source_query(row:dict,pages:int):
    seen=set(); stored=0
    for sort,mode in [(None,"deep_relevance"),("LAST_VOLUME_DESC","deep_volume")]:
      for page in range(1,pages+1):
        payload={"action":"search","keywords":row["query_text"],"ship_to":MARKET,"currency":"EUR","page":page,"page_size":PAGE_SIZE}
        if sort: payload["sort"]=sort
        try: products=(call_api(payload).get("products") or [])
        except Exception as e:
          print(json.dumps({"event":"deep_query_error","query":row["query_text"],"error":str(e)[:300]})); break
        if not products: break
        for rank,item in enumerate(products,1):
          pid=str(item.get("product_id") or "")
          if not pid or pid in seen: continue
          seen.add(pid)
          try:
            saved=upsert_product(item); upsert_offer(saved["id"],item); upsert_discovery(saved["id"],row,mode,rank); stored+=1
          except Exception as e:
            print(json.dumps({"event":"deep_candidate_error","query":row["query_text"],"error":str(e)[:250]}))
        time.sleep(.08)
    return stored

def candidate_pool(pid:str):
    return list(db_call("GET","ai_product_learning_v",params={
      "select":"product_candidate_id,offer_id,source_product_id,title,category,price_eur,promotion_url,problem_cluster_id,problem_key,problem_title,target_customer,greek_gap_opportunity,greek_gap_confidence,sold_count,seller_source_id,product_identity,pain_feature_map,winning_factors,dealbreakers,pros,cons,seller_quality,fulfillment_analysis,price_value_analysis,greek_fit_analysis,conversion_analysis,evidence_gaps,intelligence_confidence,fact_count,media_count,review_count,spec_count,data_completeness",
      "problem_cluster_id":f"eq.{pid}","order":"intelligence_confidence.desc.nullslast","limit":"150"}) or [])

def compact_candidate(x:dict):
    return {k:x.get(k) for k in [
      "product_candidate_id","offer_id","source_product_id","title","category","price_eur","sold_count",
      "seller_source_id","greek_gap_opportunity","greek_gap_confidence","intelligence_confidence",
      "fact_count","media_count","review_count","spec_count","data_completeness",
      "pain_feature_map","winning_factors","dealbreakers","pros","cons","seller_quality",
      "fulfillment_analysis","price_value_analysis","conversion_analysis","evidence_gaps"]}

def select_top3(p:dict,gap:dict,candidates:list[dict]):
    if not candidates: return []
    out=ask("""You are the Marketplace Portfolio Judge.
Choose AT MOST 3 products for ONE frozen Greek pain/gap. Do not fill slots just to reach 3.

HARD PRINCIPLES:
1. PRODUCT↔PAIN SEMANTIC FIT is first. Reject accessories, unrelated products, retrieval noise, and products whose mechanism does not plausibly solve the pain.
2. Evidence quality and trust come before commission.
3. Consider price/value, seller traction, fulfillment uncertainty, evidence gaps, and likely Greek buyer friction.
4. Avoid near-duplicate variants unless there is a meaningful role/price/use-case difference.
5. The 3 roles are BEST_FIT, BEST_VALUE, PRO. Each selected product must have a distinct defensible role.
6. If only one product deserves selection, return one. If none are credible, return zero.
7. Never invent specs, reviews, warranty, certifications, shipping or local availability.

Return JSON:
{"selected":[
 {"product_candidate_id":"uuid","offer_id":"uuid","role":"BEST_FIT|BEST_VALUE|PRO","rank":1,"confidence_0_100":0,
  "why_selected":"...","pain_fit":"...","trust_case":"...","value_case":"...","critical_risks":["..."],"why_this_role":"..."}
],
"rejected_patterns":["..."],"portfolio_note":"..."}
Ranks must be unique 1..3.""",
      {"problem":p,"frozen_gap":gap,"candidates":[compact_candidate(x) for x in candidates]})
    valid=[]; ids={(x["product_candidate_id"],x["offer_id"]):x for x in candidates}
    used_roles=set(); used_ranks=set()
    for s in out.get("selected") or []:
      key=(s.get("product_candidate_id"),s.get("offer_id"))
      role=str(s.get("role") or "")
      rank=int(s.get("rank") or 99)
      if key not in ids or role not in {"BEST_FIT","BEST_VALUE","PRO"} or role in used_roles or rank not in {1,2,3} or rank in used_ranks: continue
      used_roles.add(role); used_ranks.add(rank); valid.append(s)
    return sorted(valid,key=lambda x:int(x["rank"]))[:3]

def persist_selection(pid:str,selected:list[dict]):
    db_call("PATCH","ai_marketplace_selections",params={"problem_cluster_id":f"eq.{pid}","active":"eq.true"},
            data={"active":False},prefer="return=minimal")
    for s in selected:
      db_call("POST","ai_marketplace_selections",
        params={"on_conflict":"problem_cluster_id,product_candidate_id,offer_id"},
        data={"market_code":"GR","problem_cluster_id":pid,"product_candidate_id":s["product_candidate_id"],"offer_id":s["offer_id"],
              "selection_role":s["role"],"selection_rank":int(s["rank"]),"verdict":"SELECT",
              "confidence":float(s.get("confidence_0_100") or 0)/100,"rationale":s,
              "model_name":MODEL,"active":True},
        prefer="resolution=merge-duplicates,return=minimal")

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--pages",type=int,default=2); ap.add_argument("--max-problems",type=int,default=40)
    args=ap.parse_args()
    seen=set(); gaps=[]
    for g in latest_gaps():
      pid=g.get("problem_cluster_id")
      if pid and pid not in seen:
        seen.add(pid); gaps.append(g)
    # Prioritize actionable frozen gaps, but keep all gaps eligible for curation.
    order={"PROMISING":0,"TEST":1,"WEAK":2}
    gaps.sort(key=lambda g:(order.get(str(g.get("conversion_opportunity")),9),-float(g.get("confidence") or 0)))
    summary=[]
    for gap in gaps[:args.max_problems]:
      pid=gap["problem_cluster_id"]; p=problem(pid)
      if not p: continue
      history=query_history(pid)
      generated=expand_queries(p,gap,history)
      qrows=[]
      for i,x in enumerate(generated):
        row=ensure_query(pid,x["query"],"deep_"+x["family"],x["hypothesis"],150-i)
        if row:qrows.append(row)
      sourced=0
      for row in qrows:
        sourced+=source_query(row,max(1,args.pages))
      # Selection uses currently enriched eligible pool. New raw candidates will be enriched by the next pipeline step.
      summary.append({"problem":p["problem_key"],"new_queries":len(qrows),"stored":sourced})
      print(json.dumps({"event":"deep_research_problem",**summary[-1]}))
    print(json.dumps({"event":"deep_research_complete","problems":len(summary),"summary":summary},ensure_ascii=False))

if __name__=="__main__": main()
