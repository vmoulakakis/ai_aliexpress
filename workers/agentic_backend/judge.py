#!/usr/bin/env python3
from __future__ import annotations
import json,os,sys
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call  # noqa:E402

ENDPOINT="https://models.github.ai/inference/chat/completions"
TOKEN=os.getenv("GITHUB_TOKEN","")
FAST_MODEL=os.getenv("HYPOTHESIS_MODEL","openai/gpt-4.1-mini")
JUDGE_MODEL=os.getenv("OPPORTUNITY_JUDGE_MODEL","openai/gpt-4.1")
TOPICS=int(os.getenv("AGENTIC_TOPIC_LIMIT","20"))
PRODUCTS=int(os.getenv("AGENTIC_PRODUCT_LIMIT","60"))

def ask(model:str,system:str,payload:Any):
    if not TOKEN:raise RuntimeError("GITHUB_TOKEN_missing")
    r=requests.post(ENDPOINT,headers={"Authorization":f"Bearer {TOKEN}","Content-Type":"application/json"},
      json={"model":model,"temperature":0.12,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":system},{"role":"user","content":json.dumps(payload,ensure_ascii=False)}]},timeout=120)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])

def load_topics():
    return list(db_call("GET","market_problem_clusters",params={
      "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory",
      "market_code":"eq.GR","order":"updated_at.desc","limit":str(TOPICS)}) or [])

def build_queries(topic):
    failed=list(db_call("GET","ai_source_queries",params={
      "select":"query_text,query_family,last_result_count,last_eligible_count,consecutive_zero_runs,last_error,agent_feedback",
      "problem_cluster_id":f"eq.{topic['id']}","order":"consecutive_zero_runs.desc,last_run_at.desc.nullslast","limit":"40"}) or [])
    out=ask(FAST_MODEL,"""You are an expert AliExpress search strategist and Product Hunter for Greece.
Your job is NOT to filter products. Your job is to discover the widest plausible solution space for the problem.

Generate 8-14 search queries in AliExpress-native marketplace language. Use multiple query families:
1) broad product noun (2-4 words)
2) functional mechanism
3) professional/prosumer wording
4) alternative mechanism that solves the same pain
5) common marketplace synonym
6) use-case wording
7) component/system wording when useful

Rules:
- Avoid long natural-language sentences.
- Avoid over-specific phrases that are unlikely to exist in listings.
- Prefer concrete product nouns and marketplace terminology.
- Do not include Greece, price, seller, warehouse, shipping, trust, review or commission filters.
- EU warehouse is evidence evaluated later, never encoded into the search phrase.
- Study failed_queries. If a prior query returned zero/weak results, reformulate it rather than repeating it.
- If prior queries were too narrow, broaden. If noisy, use more precise product nouns.
- Return strict JSON:
{queries:[{query,query_family,hypothesis,reason,what_changed_from_failed_queries}]}.""",
      {"topic":topic,"failed_queries":failed})
    for i,x in enumerate(out.get("queries") or []):
      q=" ".join(str(x.get("query") or "").split()).strip()
      if not q:continue
      db_call("POST","ai_source_queries",
        params={"on_conflict":"market_code,source_key,query_text"},
        data={"market_code":"GR","source_key":"aliexpress","query_text":q,
              "problem_cluster_id":topic["id"],"hypothesis":x,
              "query_family":str(x.get("query_family") or "agentic"),
              "priority":100-i,"status":"active",
              "agent_feedback":{"generation":"adaptive","used_failed_query_feedback":bool(failed)}},
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
    rows=list(db_call("GET","ai_promotion_candidates_v",params={"select":"*","order":"observed_at.desc","limit":str(PRODUCTS)}) or [])
    for p in rows:
      prior=list(db_call("GET","ai_product_evaluations",params={
        "select":"id","product_candidate_id":f"eq.{p['product_candidate_id']}",
        "offer_id":f"eq.{p['offer_id']}","evaluator_role":"eq.final_judge","limit":"1"}) or [])
      if prior:continue
      out=ask(JUDGE_MODEL,"""You are the final Commercial Judge for a Greek commerce opportunity.
The only deterministic gate has already been applied: expected commission >= EUR 10.
Do NOT create hard thresholds for seller rating, EU warehouse, shipping, reviews, scarcity,
trust, demand, price gap or any other product-quality factor. Evaluate them holistically.
EU warehouse is strongly preferred evidence, not mandatory. Non-EU can win if full economics,
seller quality, landed cost, delivery risk, scarcity, demand and expected conversion justify it.
Return JSON {verdict:'PROMOTE'|'WATCH'|'IGNORE',confidence_0_100,opportunity_thesis,risk_thesis,
demand_analysis,greek_market_analysis,seller_analysis,fulfillment_analysis,economics_analysis,
conversion_analysis,evidence_used:[...],next_evidence:[...]}.""",{"candidate":p})
      db_call("POST","ai_product_evaluations",data={
        "product_candidate_id":p["product_candidate_id"],"offer_id":p["offer_id"],
        "evaluator_role":"final_judge","model_name":JUDGE_MODEL,"verdict":out.get("verdict"),
        "confidence":float(out.get("confidence_0_100") or 0)/100,
        "opportunity_thesis":out.get("opportunity_thesis"),"risk_thesis":out.get("risk_thesis"),
        "demand_analysis":out.get("demand_analysis") or {},"greek_market_analysis":out.get("greek_market_analysis") or {},
        "seller_analysis":out.get("seller_analysis") or {},"fulfillment_analysis":out.get("fulfillment_analysis") or {},
        "economics_analysis":out.get("economics_analysis") or {},"conversion_analysis":out.get("conversion_analysis") or {},
        "evidence":out.get("evidence_used") or [],"raw_output":out},prefer="return=minimal")

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
