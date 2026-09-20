#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,os,re,sys,time
from datetime import datetime,timezone
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call,_oidc_token

ALIEXPRESS_GATEWAY=os.getenv("ALIEXPRESS_GATEWAY","https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/aliexpress-affiliate")
AI_RESEARCH_GATEWAY=os.getenv("AI_RESEARCH_GATEWAY","https://travel-ai-lovat-psi.vercel.app/api/internal/ai-aliexpress-research")
MODEL=os.getenv("PRODUCT_INTEL_MODEL","deepseek-v4-pro")
TOKEN=os.getenv("GITHUB_TOKEN","")
MARKET=os.getenv("MARKET_CODE","GR")
TIMEOUT=int(os.getenv("PRODUCT_INTEL_TIMEOUT_SECONDS","60"))

def api_detail(product_id:str)->dict[str,Any]:
    r=requests.post(ALIEXPRESS_GATEWAY,json={"action":"product_detail","productId":product_id},timeout=TIMEOUT)
    r.raise_for_status()
    body=r.json()
    return body.get("product") or {}

def canonical_url(product_id:str)->str:
    return f"https://www.aliexpress.com/item/{product_id}.html"

def public_page_probe(product_id:str)->dict[str,Any]:
    if os.getenv("PUBLIC_PAGE_PROBE_ENABLED","false").lower() not in ("1","true","yes"):
        return {"ok":False,"blocked":False,"skipped":True,"reason":"disabled_by_default_due_to_challenge_protection"}
    url=canonical_url(product_id)
    try:
        r=requests.get(url,headers={
          "User-Agent":"Mozilla/5.0 (compatible; ProductIntelligenceBot/1.0; +https://github.com/vmoulakakis/ai_aliexpress)",
          "Accept-Language":"en-US,en;q=0.9"
        },timeout=TIMEOUT)
        text=r.text[:250000]
        blocked=("_____tmd_____" in text or "captcha" in text.lower() or "x5secdata" in text)
        return {"ok":r.ok and not blocked,"status":r.status_code,"blocked":blocked,
                "content_hash":hashlib.sha256(text.encode("utf-8","ignore")).hexdigest(),
                "html_sample":text[:4000] if not blocked else None}
    except Exception as exc:
        return {"ok":False,"error":str(exc)[:500]}

def ai_json(system:str,payload:Any)->dict[str,Any]:
    try:
      token=_oidc_token()
    except Exception:
      return {}
    r=requests.post(AI_RESEARCH_GATEWAY,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"},
      json={"system":system,"payload":payload,"max_tokens":3600},timeout=220)
    r.raise_for_status()
    body=r.json()
    if not body.get("ok"): raise RuntimeError(body)
    return body.get("data") or {}

def eligible(limit:int):
    return list(db_call("GET","ai_promotion_candidates_v",params={
      "select":"*","order":"expected_commission_eur.desc.nullslast","limit":str(limit)}) or [])

def candidate(pid:str):
    rows=list(db_call("GET","ai_product_candidates",params={
      "select":"*","id":f"eq.{pid}","limit":"1"}) or [])
    return rows[0] if rows else {}

def discoveries(pid:str):
    return list(db_call("GET","ai_product_discoveries",params={
      "select":"problem_cluster_id,query_text,retrieval_mode,result_rank,metadata,discovered_at",
      "product_candidate_id":f"eq.{pid}","order":"result_rank.asc.nullslast,discovered_at.desc","limit":"20"}) or [])

def problems(ds:list[dict[str,Any]]):
    ids=[]
    for d in ds:
      x=d.get("problem_cluster_id")
      if x and x not in ids: ids.append(x)
    out=[]
    for x in ids[:5]:
      rows=list(db_call("GET","market_problem_clusters",params={
        "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory,pain_severity_score,purchase_urgency_score,willingness_to_pay_score,evidence_summary",
        "id":f"eq.{x}","limit":"1"}) or [])
      if rows:out.append(rows[0])
    return out

def latest_gap(problem_id:str|None):
    if not problem_id:return []
    return list(db_call("GET","ai_greek_gap_assessments",params={
      "select":"*","problem_cluster_id":f"eq.{problem_id}","order":"assessed_at.desc","limit":"1"}) or [])

def existing_reviews(pid:str):
    return list(db_call("GET","ai_product_reviews",params={
      "select":"rating,review_date,reviewer_country,variant,review_text,helpful_count,image_urls,seller_reply,verified_purchase,source",
      "product_candidate_id":f"eq.{pid}","order":"review_date.desc.nullslast","limit":"100"}) or [])

def store_snapshot(pid:str,offer_id:str|None,detail:dict[str,Any],page_probe:dict[str,Any]):
    now=datetime.now(timezone.utc).isoformat()
    db_call("POST","ai_product_detail_snapshots",data={
      "product_candidate_id":pid,"offer_id":offer_id,"source":"aliexpress_official_affiliate_api",
      "source_url":detail.get("productUrl") or canonical_url(str(detail.get("productId") or "")),
      "market_code":MARKET,"title":detail.get("title"),"category":detail.get("category"),
      "seller_source_id":str(detail.get("shopId") or "") or None,
      "review_count":None,"sold_count":detail.get("sales"),"price_eur":detail.get("price"),
      "original_price_eur":detail.get("originalPrice"),"currency":detail.get("currency") or "EUR",
      "raw_payload":{"official_detail":detail,"page_probe":page_probe},"scraped_at":now
    },prefer="return=minimal")
    if detail.get("imageUrl"):
      db_call("POST","ai_product_media",params={"on_conflict":"product_candidate_id,media_type,url"},
        data={"product_candidate_id":pid,"media_type":"image","url":detail["imageUrl"],"position":1,
              "alt_text":detail.get("title"),"source":"aliexpress_official_affiliate_api",
              "source_url":detail.get("productUrl") or canonical_url(str(detail.get("productId") or "")),
              "evidence":{"role":"main_image"}},
        prefer="resolution=merge-duplicates,return=minimal")
    facts={
      "title":detail.get("title"),"category":detail.get("category"),"price_eur":detail.get("price"),
      "original_price_eur":detail.get("originalPrice"),"currency":detail.get("currency"),
      "sold_count":detail.get("sales"),"commission_rate":detail.get("commissionRate"),
      "seller_source_id":detail.get("shopId"),"seller_url":detail.get("shopUrl"),
      "promotion_link":detail.get("promotionLink"),"product_url":detail.get("productUrl"),
      "page_accessible_without_challenge":bool(page_probe.get("ok")),
      "page_challenge_detected":bool(page_probe.get("blocked"))
    }
    for k,v in facts.items():
      if v is None:continue
      db_call("POST","ai_product_facts",params={"on_conflict":"product_candidate_id,fact_type,fact_key,source"},
        data={"product_candidate_id":pid,"fact_type":"listing_fact","fact_key":k,"fact_value":{"value":v},
              "source":"aliexpress_official_affiliate_api" if not k.startswith("page_") else "aliexpress_public_page_probe",
              "source_url":detail.get("productUrl") or canonical_url(str(detail.get("productId") or "")),
              "confidence":1.0,"evidence_text":f"{k}: {v}"},
        prefer="resolution=merge-duplicates,return=minimal")

INTEL_SYSTEM="""You are a senior product intelligence analyst for Greek affiliate commerce.
Use ONLY supplied evidence. Never invent specs, warranty, certifications, review quotes, seller claims, shipping claims or market facts.
A missing review corpus must be explicitly called an evidence gap.
The product is already eligible because realistic expected commission is >= EUR 10; do not treat commission as proof of quality.
Map product features/claims to the supplied Greek pain, distinguish exact solution from weak semantic match, and identify conversion friction.
Return strict JSON with:
product_identity, pain_feature_map[], winning_factors[], dealbreakers[], pros[], cons[],
review_sentiment, seller_quality, fulfillment_analysis, price_value_analysis, greek_fit_analysis,
conversion_analysis, audience_personas[], who_not_for[], objection_handling[], evidence_gaps[],
confidence_0_100.
Pros/cons must be evidence-grounded. Include at least two cons when evidence supports them; otherwise list evidence gaps rather than inventing negatives."""

SEO_SYSTEM="""You are a Greek SEO product-intelligence agent.
Use only supplied product/problem/evidence. Do not invent search volume or rankings.
Optimize around buyer pain and commercial intent, not keyword stuffing.
Return strict JSON:
primary_keyword, secondary_keywords[], long_tail_keywords[], semantic_entities[], search_intents[],
pain_queries[], comparison_queries[], faq_questions[], title_options[], meta_description_options[],
schema_hints, internal_link_topics[], content_brief, confidence_0_100.
Greek should be the primary language; English technical product entities may be preserved."""

def synthesize(row:dict[str,Any],cand:dict[str,Any],detail:dict[str,Any],ds,probs,gap,reviews,page_probe):
    payload={"eligible_offer":row,"candidate":cand,"official_detail":detail,
             "discoveries":ds,"problems":probs,"greek_gap_assessment":gap,
             "reviews":reviews,"page_probe":page_probe}
    intel=ai_json(INTEL_SYSTEM,payload)
    seo=ai_json(SEO_SYSTEM,{"product_intelligence":intel,**payload})
    problem_id=probs[0]["id"] if probs else None
    db_call("POST","ai_product_intelligence",data={
      "product_candidate_id":row["product_candidate_id"],"offer_id":row.get("offer_id"),
      "problem_cluster_id":problem_id,"model_name":MODEL,"intelligence_version":"product-intel-v1",
      "product_identity":intel.get("product_identity") or {},
      "pain_feature_map":intel.get("pain_feature_map") or [],
      "winning_factors":intel.get("winning_factors") or [],
      "dealbreakers":intel.get("dealbreakers") or [],
      "pros":intel.get("pros") or [],"cons":intel.get("cons") or [],
      "review_sentiment":intel.get("review_sentiment") or {},
      "seller_quality":intel.get("seller_quality") or {},
      "fulfillment_analysis":intel.get("fulfillment_analysis") or {},
      "price_value_analysis":intel.get("price_value_analysis") or {},
      "greek_fit_analysis":intel.get("greek_fit_analysis") or {},
      "conversion_analysis":intel.get("conversion_analysis") or {},
      "audience_personas":intel.get("audience_personas") or [],
      "who_not_for":intel.get("who_not_for") or [],
      "objection_handling":intel.get("objection_handling") or [],
      "evidence_gaps":intel.get("evidence_gaps") or [],
      "confidence":float(intel.get("confidence_0_100") or 0)/100,
      "raw_output":intel
    },prefer="return=minimal")
    db_call("POST","ai_product_seo_intelligence",data={
      "product_candidate_id":row["product_candidate_id"],"problem_cluster_id":problem_id,
      "language":"el","market_code":"GR","primary_keyword":seo.get("primary_keyword"),
      "secondary_keywords":seo.get("secondary_keywords") or [],
      "long_tail_keywords":seo.get("long_tail_keywords") or [],
      "semantic_entities":seo.get("semantic_entities") or [],
      "search_intents":seo.get("search_intents") or [],
      "pain_queries":seo.get("pain_queries") or [],
      "comparison_queries":seo.get("comparison_queries") or [],
      "faq_questions":seo.get("faq_questions") or [],
      "title_options":seo.get("title_options") or [],
      "meta_description_options":seo.get("meta_description_options") or [],
      "schema_hints":seo.get("schema_hints") or {},
      "internal_link_topics":seo.get("internal_link_topics") or [],
      "content_brief":seo.get("content_brief") or {},
      "confidence":float(seo.get("confidence_0_100") or 0)/100,
      "evidence":{"official_detail":bool(detail),"reviews_count":len(reviews),
                  "public_page_accessible":bool(page_probe.get("ok"))}
    },prefer="return=minimal")

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--limit",type=int,default=200);ap.add_argument("--skip-ai",action="store_true")
    args=ap.parse_args()
    rows=eligible(args.limit)
    stats={"eligible":len(rows),"details":0,"page_accessible":0,"page_blocked":0,"intel":0,"errors":0}
    for row in rows:
      try:
        cand=candidate(row["product_candidate_id"])
        product_id=str(cand.get("source_product_id") or "")
        if not product_id:continue
        detail=api_detail(product_id); stats["details"]+=bool(detail)
        probe=public_page_probe(product_id)
        stats["page_accessible"]+=1 if probe.get("ok") else 0
        stats["page_blocked"]+=1 if probe.get("blocked") else 0
        store_snapshot(row["product_candidate_id"],row.get("offer_id"),detail,probe)
        ds=discoveries(row["product_candidate_id"]); probs=problems(ds)
        gap=latest_gap(probs[0]["id"] if probs else None)
        reviews=existing_reviews(row["product_candidate_id"])
        if not reviews:
          db_call("POST","ai_product_facts",params={"on_conflict":"product_candidate_id,fact_type,fact_key,source"},
            data={"product_candidate_id":row["product_candidate_id"],"fact_type":"evidence_gap",
                  "fact_key":"review_text_corpus","fact_value":{"status":"unavailable"},
                  "source":"product_intelligence_worker","confidence":1.0,
                  "evidence_text":"Official affiliate detail does not expose review text; public PDP returned challenge or no stable review corpus."},
            prefer="resolution=merge-duplicates,return=minimal")
        if not args.skip_ai and TOKEN:
          synthesize(row,cand,detail,ds,probs,gap,reviews,probe);stats["intel"]+=1
        time.sleep(.15)
      except Exception as exc:
        stats["errors"]+=1
        print(json.dumps({"event":"product_intelligence_error","product_candidate_id":row.get("product_candidate_id"),"error":str(exc)[:500]}))
    print(json.dumps({"event":"product_intelligence_complete",**stats}))
if __name__=="__main__":main()
