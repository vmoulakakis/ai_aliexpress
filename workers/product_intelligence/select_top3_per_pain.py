#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,os,sys
from collections import defaultdict
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call,_oidc_token

AI_RESEARCH_GATEWAY=os.getenv("AI_RESEARCH_GATEWAY","https://travel-ai-lovat-psi.vercel.app/api/internal/ai-aliexpress-research")
MODEL=os.getenv("MARKETPLACE_SELECTOR_MODEL","deepseek-v4-pro")

def ask(system:str,payload:Any)->dict[str,Any]:
    token=_oidc_token()
    r=requests.post(AI_RESEARCH_GATEWAY,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"},
      json={"system":system,"payload":payload,"max_tokens":3600},timeout=220)
    r.raise_for_status(); body=r.json()
    if not body.get("ok"): raise RuntimeError(body)
    return body.get("data") or {}

SYSTEM="""You are the Marketplace Product Selection Board for a Greek proof-commerce marketplace.
For ONE fixed Greek pain, choose up to the supplied winner_cap (never more than 3) from the eligible AliExpress pool.

Rules:
- Semantic product↔pain fit comes first. Reject retrieval noise aggressively.
- Commission >= EUR 10 was already applied and must NOT be used as a quality signal.
- Seller reliability, reviews/orders, EU warehouse, shipping, landed-cost risk, returns/warranty, Greek scarcity and price/value are weighted evidence, NOT rigid gates.
- Prefer clearly evidenced products and disclose unknowns.
- Collapse variants/OEM rebrands/near-identical listings into one solution family.
- Prefer materially different solution mechanisms or buyer tiers.
- If only 1 product is credible, select 1. If none are credible, select 0.
- Never invent specs, reviews, certifications, warranty, delivery or savings.

Return JSON only:
{"selected":[{"product_candidate_id":"uuid","offer_id":"uuid","rank":1,
"role":"best_fit|best_value|professional|alternative_mechanism",
"solution_family":"short canonical family",
"fit_score_0_100":0,"trust_score_0_100":0,"value_score_0_100":0,"confidence_0_100":0,
"thesis":"short evidence-based reason","risks":[]}],
"rejected_examples":[{"product_candidate_id":"uuid","reason":"semantic_mismatch|weak_evidence|duplicate|poor_value|other"}],
"selection_summary":"..."}"""

def all_candidates():
    return list(db_call("GET","ai_product_learning_v",params={
      "select":"product_candidate_id,offer_id,source_product_id,title,category,price_eur,problem_cluster_id,problem_key,problem_title,target_customer,greek_gap_opportunity,greek_gap_confidence,sold_count,seller_source_id,pain_feature_map,pros,cons,dealbreakers,seller_quality,fulfillment_analysis,price_value_analysis,greek_fit_analysis,evidence_gaps,intelligence_confidence,fact_count,media_count,review_count,spec_count,data_completeness",
      "limit":"5000"}) or [])

def allocation(pid:str):
    rows=list(db_call("GET","ai_demand_allocation_v",params={"select":"*","problem_cluster_id":f"eq.{pid}","limit":"1"}) or [])
    return rows[0] if rows else {}

def compact(p:dict):
    return {k:p.get(k) for k in ["product_candidate_id","offer_id","source_product_id","title","category","price_eur","sold_count",
      "seller_source_id","pain_feature_map","pros","cons","dealbreakers","seller_quality","fulfillment_analysis",
      "price_value_analysis","greek_fit_analysis","intelligence_confidence","fact_count","media_count","review_count","spec_count",
      "data_completeness","evidence_gaps"]}

def heuristic_key(p):
    return (float(p.get("intelligence_confidence") or 0),int(p.get("sold_count") or 0),int(p.get("fact_count") or 0),-float(p.get("price_eur") or 0))

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--max-candidates-per-pain",type=int,default=40);args=ap.parse_args()
    groups=defaultdict(list)
    for p in all_candidates():
        if p.get("problem_cluster_id"):groups[p["problem_cluster_id"]].append(p)
    stats={"pains":0,"selected":0,"empty":0}
    for pid,items in groups.items():
        a=allocation(pid); cap=min(3,max(0,int(a.get("winner_cap") or 0)))
        if cap<=0: continue
        items=sorted(items,key=heuristic_key,reverse=True)[:args.max_candidates_per_pain]
        payload={"demand_allocation":a,"winner_cap":cap,"candidate_pool":[compact(x) for x in items]}
        try:out=ask(SYSTEM,payload)
        except Exception as exc:
            print(json.dumps({"event":"selection_error","problem_key":a.get("problem_key"),"error":str(exc)[:400]}));continue
        db_call("PATCH","ai_marketplace_selections",params={"problem_cluster_id":f"eq.{pid}","active":"eq.true"},data={"active":False},prefer="return=minimal")
        selected=(out.get("selected") or [])[:cap];rank=0;families=set()
        for x in selected:
            pcid=str(x.get("product_candidate_id") or "");match=next((p for p in items if p["product_candidate_id"]==pcid),None)
            if not match:continue
            fit=float(x.get("fit_score_0_100") or 0)
            if fit<60:continue
            family=" ".join(str(x.get("solution_family") or "").lower().split())
            if family and family in families:continue
            if family:families.add(family)
            rank+=1
            rationale={**x,"selection_summary":out.get("selection_summary"),"candidate_pool_size":len(items),
              "demand_score":a.get("demand_score"),"research_priority_score":a.get("research_priority_score"),
              "demand_winner_cap":cap,"policy":"demand-adaptive-max3-v2"}
            db_call("POST","ai_marketplace_selections",
              params={"on_conflict":"problem_cluster_id,product_candidate_id,offer_id"},
              data={"market_code":"GR","problem_cluster_id":pid,"product_candidate_id":pcid,"offer_id":match.get("offer_id"),
                "selection_role":x.get("role") or "best_fit","selection_rank":rank,"verdict":"SELECT",
                "confidence":float(x.get("confidence_0_100") or 0)/100,"rationale":rationale,"model_name":MODEL,"active":True},
              prefer="resolution=merge-duplicates,return=minimal")
            if rank>=cap:break
        stats["pains"]+=1;stats["selected"]+=rank
        if rank==0:stats["empty"]+=1
        print(json.dumps({"event":"pain_selected","problem_key":a.get("problem_key"),"category":a.get("category"),
          "subcategory":a.get("subcategory"),"demand_score":a.get("demand_score"),"winner_cap":cap,"pool":len(items),"selected":rank}))
    print(json.dumps({"event":"marketplace_demand_adaptive_top3_complete",**stats}))

if __name__=="__main__":main()
