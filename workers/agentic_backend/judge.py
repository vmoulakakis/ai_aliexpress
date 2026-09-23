#!/usr/bin/env python3
from __future__ import annotations
import json,os,sys
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call  # noqa:E402

ENDPOINT="https://api.openai.com/v1/chat/completions"
TOKEN=os.getenv("OPENAI_API_KEY","")
FAST_MODEL=os.getenv("HYPOTHESIS_MODEL","openai/gpt-4.1-mini")
SEARCH_MODEL=os.getenv("PRODUCT_SEARCH_MODEL","openai/gpt-4.1")
JUDGE_MODEL=os.getenv("OPPORTUNITY_JUDGE_MODEL","openai/gpt-4.1")
TOPICS=int(os.getenv("AGENTIC_TOPIC_LIMIT","20"))
PRODUCTS=int(os.getenv("AGENTIC_PRODUCT_LIMIT","60"))

def ask(model:str,system:str,payload:Any):
    if not TOKEN:raise RuntimeError("OPENAI_API_KEY_missing")
    r=requests.post(ENDPOINT,headers={"Authorization":f"Bearer {TOKEN}","Content-Type":"application/json"},
      json={"model":model.removeprefix("openai/"),"temperature":0.12,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":system},{"role":"user","content":json.dumps(payload,ensure_ascii=False)}]},timeout=120)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])

def load_topics():
    return list(db_call("GET","market_problem_clusters",params={
      "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory",
      "market_code":"eq.GR","order":"updated_at.desc","limit":str(TOPICS)}) or [])

def build_queries(topic):
    history=list(db_call("GET","ai_source_queries",params={
      "select":"query_text,query_family,last_result_count,last_eligible_count,consecutive_zero_runs,last_error,agent_feedback,hypothesis",
      "problem_cluster_id":f"eq.{topic['id']}","order":"last_run_at.desc.nullslast,priority.desc","limit":"60"}) or [])

    # Give the Search Planner actual marketplace feedback. It sees what AliExpress
    # called the products, which categories appeared, and whether the previous
    # query was zero-result, noisy, or commercially useful.
    marketplace_feedback=[]
    for row in history:
      fb=row.get("agent_feedback") or {}
      marketplace_feedback.append({
        "query":row.get("query_text"),
        "query_family":row.get("query_family"),
        "result_count":row.get("last_result_count"),
        "eligible_count":row.get("last_eligible_count"),
        "zero_runs":row.get("consecutive_zero_runs"),
        "last_error":row.get("last_error"),
        "sample_results":(fb.get("sample_results") or [])[:12],
        "previous_hypothesis":row.get("hypothesis") or {}
      })

    out=ask(SEARCH_MODEL,"""You are the Senior Marketplace Retrieval Agent for AliExpress.
You are not a filter and you are not a copywriter. You are a search-retrieval specialist.

GOAL:
Discover the broadest plausible set of physical products that could solve the supplied Greek customer problem.
Your output becomes live AliExpress search queries.

USE MARKETPLACE FEEDBACK:
- Inspect prior result counts.
- Inspect returned product titles and categories.
- Learn AliExpress seller vocabulary from sample_results.
- Detect when a query is too narrow, too broad/noisy, or using terminology sellers do not use.
- Never repeat a zero-result phrase unchanged.
- If returned titles reveal a better noun/synonym, reuse that marketplace vocabulary.
- If a query returns many irrelevant products, tighten the PRODUCT NOUN, not by adding commercial filters.

CREATE A SEARCH PORTFOLIO, NOT ONE QUERY:
A. 2 broad anchor nouns: 1-3 concrete product words.
B. 2 mechanism queries: physical mechanism/technology.
C. 2 professional/prosumer queries: terminology technicians or B2B sellers use.
D. 2 synonym queries: alternate marketplace names for the same product class.
E. 2 adjacent-solution queries: a different product mechanism solving the same pain.
F. 1-2 component/system queries where a component is more likely listed than the full solution.

QUERY RULES:
- 1-6 words preferred; maximum 8 words.
- English marketplace terminology.
- Concrete physical product nouns.
- No full natural-language questions.
- No Greece, EU, warehouse, seller, review, trust, shipping, price, discount, commission or rating terms.
- Do not encode deterministic filters.
- Do not assume the product category in advance; explore alternate solution mechanisms.
- Avoid marketing adjectives unless they are genuine marketplace nouns such as industrial, automotive, marine, LoRa, thermal.
- Distinguish discovery from commercial judgment: retrieval should be broad; AI judges quality later.

Return strict JSON:
{
  "diagnosis":{
    "what_failed_before":[],
    "useful_marketplace_vocabulary":[],
    "retrieval_strategy":"..."
  },
  "queries":[
    {
      "query":"...",
      "query_family":"anchor|mechanism|professional|synonym|adjacent_solution|component",
      "hypothesis":"what physical solution this is trying to discover",
      "reason":"why AliExpress is likely to use these words",
      "learned_from":"problem|prior_results|zero_result_recovery"
    }
  ]
}""",{"topic":topic,"marketplace_feedback":marketplace_feedback})

    diagnosis=out.get("diagnosis") or {}
    seen=set()
    for i,x in enumerate(out.get("queries") or []):
      q=" ".join(str(x.get("query") or "").split()).strip()
      norm=q.lower()
      if not q or norm in seen:continue
      seen.add(norm)
      words=q.split()
      if len(words)>8: q=" ".join(words[:8])
      db_call("POST","ai_source_queries",
        params={"on_conflict":"market_code,source_key,query_text"},
        data={"market_code":"GR","source_key":"aliexpress","query_text":q,
              "problem_cluster_id":topic["id"],"hypothesis":x,
              "query_family":str(x.get("query_family") or "agentic"),
              "priority":120-i,"status":"active",
              "agent_feedback":{
                "generation":"professional_adaptive_search_v2",
                "used_marketplace_feedback":bool(marketplace_feedback),
                "planner_diagnosis":diagnosis
              }},
        prefer="resolution=merge-duplicates,return=minimal")

def forecast(topic):
    signals=list(db_call("GET","ai_demand_signals",params={
      "select":"id,source_family,source_name,signal_type,observed_value,evidence_url,evidence_text,observed_at,ai_relevance,ai_purchase_intent,ai_confidence,metadata",
      "problem_cluster_id":f"eq.{topic['id']}","order":"observed_at.desc","limit":"120"}) or [])
    if not signals:return
    out=ask(JUDGE_MODEL,"""You are the Greek demand Forecast Agent. Use only supplied evidence.
Estimate directional demand for 30, 60 and 90 days. Never invent search volume, sales or market size.
Return JSON {horizon_30:{direction,score_0_100,reason},horizon_60:{direction,score_0_100,reason},
horizon_90:{direction,score_0_100,reason},expected_peak:{window,reason},drivers:[...],risks:[...],
confidence_0_100}. Scores are AI directional indices, not measured demand.""",{"topic":topic,"signals":signals})
    db_call("POST","ai_demand_forecasts",data={
      "market_code":"GR","topic_key":str(topic.get("problem_key") or topic["id"]),
      "problem_cluster_id":topic["id"],"model_name":JUDGE_MODEL,
      "horizon_30":out.get("horizon_30") or {},"horizon_60":out.get("horizon_60") or {},
      "horizon_90":out.get("horizon_90") or {},"expected_peak":out.get("expected_peak") or {},
      "drivers":out.get("drivers") or [],"risks":out.get("risks") or [],
      "confidence":float(out.get("confidence_0_100") or 0)/100,
      "evidence_ids":[x["id"] for x in signals if x.get("id")],"raw_output":out},prefer="return=minimal")

def judge_products():
    rows=list(db_call("GET","ai_promotion_candidates_v",params={
      "select":"*","order":"observed_at.desc","limit":str(PRODUCTS)}) or [])
    for p in rows:
      discoveries=list(db_call("GET","ai_product_discoveries",params={
        "select":"problem_cluster_id,query_text,retrieval_mode,result_rank,metadata,discovered_at",
        "product_candidate_id":f"eq.{p['product_candidate_id']}",
        "order":"result_rank.asc.nullslast,discovered_at.desc","limit":"12"}) or [])
      problem_ids=[]
      for d in discoveries:
        pid=d.get("problem_cluster_id")
        if pid and pid not in problem_ids: problem_ids.append(pid)
      problems=[]
      for pid in problem_ids[:4]:
        found=list(db_call("GET","market_problem_clusters",params={
          "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory,pain_severity_score,purchase_urgency_score,willingness_to_pay_score,confidence,evidence_summary",
          "id":f"eq.{pid}","limit":"1"}) or [])
        if found: problems.append(found[0])

      primary_problem_id=problems[0]["id"] if problems else None
      prior_params={"select":"id","product_candidate_id":f"eq.{p['product_candidate_id']}",
                    "offer_id":f"eq.{p['offer_id']}","evaluator_role":"eq.final_judge","limit":"1"}
      if primary_problem_id: prior_params["problem_cluster_id"]=f"eq.{primary_problem_id}"
      prior=list(db_call("GET","ai_product_evaluations",params=prior_params) or [])
      if prior: continue

      signals=[]
      gap_assessments=[]
      if primary_problem_id:
        signals=list(db_call("GET","ai_demand_signals",params={
          "select":"source_family,source_name,signal_type,observed_value,evidence_text,observed_at,ai_relevance,ai_purchase_intent,ai_confidence,metadata",
          "problem_cluster_id":f"eq.{primary_problem_id}","order":"observed_at.desc","limit":"40"}) or [])
        gap_assessments=list(db_call("GET","ai_greek_gap_assessments",params={
          "select":"lifecycle,demand_state,pain_state,supply_state,competition_state,exact_match_state,substitute_state,price_gap_state,buyer_intent_state,conversion_opportunity,confidence,evidence_count,thesis,counter_thesis,next_actions,assessed_at",
          "problem_cluster_id":f"eq.{primary_problem_id}","order":"assessed_at.desc","limit":"3"}) or [])

      out=ask(JUDGE_MODEL,"""You are the final Commercial Judge for a Greek commerce opportunity.
The only deterministic gate has already been applied: expected commission >= EUR 10.

Judge PRODUCT-PROBLEM FIT first. A high-commission product is not an opportunity if it poorly solves the Greek problem.
Use the discovery queries and returned product evidence to understand why the product was found.

Evaluate holistically:
- semantic fit to the Greek problem and target customer
- strength of the physical solution
- Greek pain-gap evidence: buyer pain, purchase intent, exact local supply, substitutes and competition
- demand evidence quality (distinguish AI hypotheses from externally observed evidence)
- latest Greek Gap Assessment when available; treat it as evidence synthesis, not a deterministic filter
- likely Greek scarcity/substitute risk
- seller/product trust evidence
- fulfillment and landed-cost uncertainty
- realistic commission economics
- likely conversion friction for Greek buyers
- seasonality/timing
- evidence gaps

Do NOT create hard thresholds for seller rating, EU warehouse, shipping, reviews, scarcity,
trust, demand, price gap, sales volume or any other product-quality factor.
EU warehouse is strongly preferred evidence, not mandatory.
Zero sales does not automatically reject a product; it increases uncertainty.
A very high price does not automatically reject a product; judge target-customer willingness to pay and conversion friction.
Return JSON {
 verdict:'PROMOTE'|'WATCH'|'IGNORE',
 confidence_0_100,
 product_problem_fit_0_100,
 opportunity_thesis,
 risk_thesis,
 demand_analysis,
 greek_market_analysis,
 seller_analysis,
 fulfillment_analysis,
 economics_analysis,
 conversion_analysis,
 evidence_used:[...],
 next_evidence:[...]
}.""",
        {"candidate":p,"discoveries":discoveries,"problems":problems,"demand_signals":signals,
         "greek_gap_assessments":gap_assessments})

      db_call("POST","ai_product_evaluations",data={
        "product_candidate_id":p["product_candidate_id"],"offer_id":p["offer_id"],
        "problem_cluster_id":primary_problem_id,
        "evaluator_role":"final_judge","model_name":JUDGE_MODEL,"verdict":out.get("verdict"),
        "confidence":float(out.get("confidence_0_100") or 0)/100,
        "opportunity_thesis":out.get("opportunity_thesis"),"risk_thesis":out.get("risk_thesis"),
        "demand_analysis":{**(out.get("demand_analysis") or {}),"product_problem_fit_0_100":out.get("product_problem_fit_0_100")},
        "greek_market_analysis":out.get("greek_market_analysis") or {},
        "seller_analysis":out.get("seller_analysis") or {},
        "fulfillment_analysis":out.get("fulfillment_analysis") or {},
        "economics_analysis":out.get("economics_analysis") or {},
        "conversion_analysis":out.get("conversion_analysis") or {},
        "evidence":out.get("evidence_used") or [],
        "raw_output":{**out,"discovery_context":discoveries,"problem_context":problems}},
        prefer="return=minimal")

def main():
    topics=load_topics()
    for t in topics:
      try:build_queries(t)
      except Exception as e:print(json.dumps({"event":"product_hunter_error","topic":t["id"],"error":str(e)[:300]}))
      try:forecast(t)
      except Exception as e:print(json.dumps({"event":"forecast_error","topic":t["id"],"error":str(e)[:300]}))
    judge_products()
    print(json.dumps({"event":"agentic_cycle_complete","topics":len(topics)}))
if __name__=="__main__":main()
