#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,os,sys
from collections import defaultdict
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call

ENDPOINT="https://models.github.ai/inference/chat/completions"
TOKEN=os.getenv("GITHUB_TOKEN","")
MODEL=os.getenv("MARKETPLACE_SELECTOR_MODEL","openai/gpt-4.1")

def ask(system:str,payload:Any)->dict[str,Any]:
    if not TOKEN: raise RuntimeError("GITHUB_TOKEN_missing")
    r=requests.post(ENDPOINT,headers={"Authorization":f"Bearer {TOKEN}","Content-Type":"application/json"},
      json={"model":MODEL,"temperature":0.04,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":system},{"role":"user","content":json.dumps(payload,ensure_ascii=False)}]},timeout=120)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])

SYSTEM="""You are the Marketplace Product Selection Board for a Greek proof-commerce marketplace.

For ONE fixed Greek pain, choose AT MOST 3 products from the supplied eligible AliExpress pool.

CRITICAL:
- Do not select a product just because retrieval found it.
- Reject semantic mismatches aggressively. A dashcam is not a vibration sensor; a generic camera is not a rebar scanner.
- Product-problem fit is the first gate.
- The commission >= EUR 10 gate was already applied. Commission is NOT a quality signal and must not influence selection.
- Prefer evidence-backed products with clearer mechanism, better seller/listing traction, more complete facts, and lower fulfillment uncertainty.
- Use Greek market-gap context as evidence, not as a product-quality guarantee.
- Avoid three near-identical listings when distinct credible mechanisms or value tiers exist.
- If only 1 or 2 products are credible, select only 1 or 2. If none are credible, select none.
- Never invent specs, reviews, warranty, certifications, delivery or savings.

Aim for useful roles when evidence allows:
best_fit, best_value, professional, alternative_mechanism.

Return strict JSON:
{
 "selected":[
   {
    "product_candidate_id":"uuid",
    "offer_id":"uuid",
    "rank":1,
    "role":"best_fit|best_value|professional|alternative_mechanism",
    "fit_score_0_100":0,
    "trust_score_0_100":0,
    "value_score_0_100":0,
    "confidence_0_100":0,
    "thesis":"short evidence-based reason",
    "risks":[]
   }
 ],
 "rejected_examples":[{"product_candidate_id":"uuid","reason":"semantic_mismatch|weak_evidence|duplicate|poor_value|other"}],
 "selection_summary":"..."
}"""

def all_candidates():
    return list(db_call("GET","ai_product_learning_v",params={
      "select":"product_candidate_id,offer_id,source_product_id,title,category,price_eur,expected_commission_eur,problem_cluster_id,problem_key,problem_title,target_customer,greek_gap_opportunity,greek_gap_confidence,sold_count,seller_source_id,pain_feature_map,pros,cons,dealbreakers,seller_quality,fulfillment_analysis,price_value_analysis,greek_fit_analysis,evidence_gaps,intelligence_confidence,fact_count,media_count,review_count,spec_count,data_completeness",
      "limit":"5000"}) or [])

def problem_info(pid:str):
    rows=list(db_call("GET","market_problem_clusters",params={
      "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory,pain_severity_score,purchase_urgency_score,willingness_to_pay_score",
      "id":f"eq.{pid}","limit":"1"}) or [])
    return rows[0] if rows else {}

def gap_info(pid:str):
    rows=list(db_call("GET","ai_greek_gap_assessments",params={
      "select":"conversion_opportunity,confidence,demand_state,pain_state,supply_state,competition_state,buyer_intent_state,thesis,counter_thesis,assessed_at",
      "problem_cluster_id":f"eq.{pid}","order":"assessed_at.desc","limit":"1"}) or [])
    return rows[0] if rows else {}

def compact(p:dict):
    seller=p.get("seller_quality") or {}
    return {
      "product_candidate_id":p["product_candidate_id"],"offer_id":p.get("offer_id"),
      "source_product_id":p.get("source_product_id"),"title":p.get("title"),"category":p.get("category"),
      "price_eur":p.get("price_eur"),"sold_count":p.get("sold_count"),
      "seller_source_id":p.get("seller_source_id"),
      "seller_evidence":seller.get("available_evidence"),
      "pain_feature_map":p.get("pain_feature_map"),
      "pros":p.get("pros"),"cons":p.get("cons"),"dealbreakers":p.get("dealbreakers"),
      "fulfillment":p.get("fulfillment_analysis"),
      "price_value":p.get("price_value_analysis"),
      "intelligence_confidence":p.get("intelligence_confidence"),
      "fact_count":p.get("fact_count"),"media_count":p.get("media_count"),
      "review_count":p.get("review_count"),"spec_count":p.get("spec_count"),
      "data_completeness":p.get("data_completeness"),"evidence_gaps":p.get("evidence_gaps")
    }

def heuristic_key(p):
    return (
      float(p.get("intelligence_confidence") or 0),
      int(p.get("sold_count") or 0),
      int(p.get("fact_count") or 0),
      -float(p.get("price_eur") or 0)
    )

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--max-candidates-per-pain",type=int,default=35)
    args=ap.parse_args()
    groups=defaultdict(list)
    for p in all_candidates():
        if p.get("problem_cluster_id"): groups[p["problem_cluster_id"]].append(p)

    stats={"pains":0,"selected":0,"empty":0}
    for pid,items in groups.items():
        problem=problem_info(pid); gap=gap_info(pid)
        if not problem: continue
        # Keep a broad but bounded AI comparison set.
        items=sorted(items,key=heuristic_key,reverse=True)[:args.max_candidates_per_pain]
        payload={"problem":problem,"frozen_gap":gap,"candidate_pool":[compact(x) for x in items]}
        try: out=ask(SYSTEM,payload)
        except Exception as exc:
            print(json.dumps({"event":"selection_error","problem_key":problem.get("problem_key"),"error":str(exc)[:400]}))
            continue

        # Replace active shortlist for this pain atomically enough for the worker gateway.
        db_call("DELETE","ai_gap_product_shortlist",params={"problem_cluster_id":f"eq.{pid}"},prefer="return=minimal")
        selected=(out.get("selected") or [])[:3]
        rank=0
        for x in selected:
            pcid=str(x.get("product_candidate_id") or "")
            match=next((p for p in items if p["product_candidate_id"]==pcid),None)
            if not match: continue
            fit=float(x.get("fit_score_0_100") or 0)
            conf=float(x.get("confidence_0_100") or 0)
            # Safety floor only for semantic relevance; not a commercial/product-quality gate.
            if fit < 60: continue
            rank+=1
            db_call("POST","ai_gap_product_shortlist",data={
              "problem_cluster_id":pid,"product_candidate_id":pcid,"offer_id":match.get("offer_id"),
              "selection_role":x.get("role") or "best_fit","rank":rank,"verdict":"SELECTED",
              "confidence":conf/100,"product_problem_fit":fit/100,
              "differentiation_score":float(x.get("value_score_0_100") or 0)/100,
              "selection_thesis":x.get("thesis"),
              "rejection_risks":x.get("risks") or [],
              "evidence":{"trust_score_0_100":x.get("trust_score_0_100"),"value_score_0_100":x.get("value_score_0_100"),
                          "selection_summary":out.get("selection_summary"),"candidate_pool_size":len(items),
                          "frozen_gap_opportunity":gap.get("conversion_opportunity")},
              "model_name":MODEL,"research_run_id":"deep_gap_research_v1"
            },prefer="return=minimal")
            if rank>=3: break
        stats["pains"]+=1;stats["selected"]+=rank
        if rank==0:stats["empty"]+=1
        print(json.dumps({"event":"pain_selected","problem_key":problem.get("problem_key"),"pool":len(items),"selected":rank}))
    print(json.dumps({"event":"marketplace_top3_complete",**stats}))

if __name__=="__main__": main()
