#!/usr/bin/env python3
# full-cycle trigger: pain-gap-rag-v2
from __future__ import annotations
import hashlib,json,os,sys
from datetime import datetime,timezone
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call

SEARX=os.getenv("SEARXNG_BASE_URL","http://127.0.0.1:8080").rstrip("/")
MODEL_ENDPOINT="https://models.github.ai/inference/chat/completions"
MODEL=os.getenv("DEMAND_AGENT_MODEL","openai/gpt-4.1-mini")
TOKEN=os.getenv("GITHUB_TOKEN","")
TOPIC_LIMIT=int(os.getenv("DEMAND_TOPIC_LIMIT","20"))
RESULTS_PER_QUERY=int(os.getenv("DEMAND_RESULTS_PER_QUERY","6"))

# Free-first evidence portfolio. BestPrice is mandatory in every cycle.
SOURCE_PLANS=[
 ("bestprice","greek_marketplace","bestprice.gr",[
   "{topic} site:bestprice.gr",
   "{topic} τιμή site:bestprice.gr",
 ]),
 ("skroutz","greek_marketplace","skroutz.gr",[
   "{topic} site:skroutz.gr",
   "{topic} αγορά site:skroutz.gr",
 ]),
 ("greek_web","search",None,[
   '"{topic}" τιμή Ελλάδα',
   '"{topic}" αγορά Ελλάδα',
   '"{topic}" "πού θα βρω"',
   '"{topic}" επαγγελματικό Ελλάδα',
 ]),
 ("greek_pain","pain_signal",None,[
   '"{pain}" Ελλάδα',
   '"{pain}" κόστος',
   '"{pain}" λύση',
 ]),
 ("reddit","social","reddit.com",[
   '"{topic}" Greece site:reddit.com',
   '"{pain}" Greece site:reddit.com',
 ]),
 ("youtube","social","youtube.com",[
   '"{topic}" Greece review site:youtube.com',
   '"{topic}" Ελλάδα site:youtube.com',
 ]),
]

def ai_json(system:str,payload:Any)->dict[str,Any]:
    if not TOKEN:return {}
    r=requests.post(MODEL_ENDPOINT,headers={"Authorization":f"Bearer {TOKEN}","Content-Type":"application/json"},
      json={"model":MODEL,"temperature":0.1,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":system},{"role":"user","content":json.dumps(payload,ensure_ascii=False)}]},timeout=90)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])

def search(q:str):
    r=requests.get(f"{SEARX}/search",params={"q":q,"format":"json","language":"el-GR"},timeout=45)
    r.raise_for_status()
    return list(r.json().get("results") or [])[:RESULTS_PER_QUERY]

def topics():
    return list(db_call("GET","market_problem_clusters",params={
      "select":"id,problem_key,problem_title,problem_description,target_customer,category,subcategory",
      "market_code":"eq.GR","order":"updated_at.desc","limit":str(TOPIC_LIMIT)}) or [])

def normalized_topic(topic:dict[str,Any])->str:
    return str(topic.get("problem_title") or topic.get("problem_key") or "").strip()

def content_hash(url:str,title:str,snippet:str)->str:
    return hashlib.sha256(f"{url}|{title}|{snippet}".encode("utf-8")).hexdigest()

CLASSIFIER="""You are the Evidence Extraction Agent for Greek pain-gap commerce.
Use ONLY the supplied search result and problem context. Never invent sales, search volume, prices,
stock, rankings, certifications, warranties or market share.

Classify whether this result is evidence of:
- buyer pain / urgency
- purchase intent
- exact Greek supply
- functional substitute supply
- local competition
- price/availability
- irrelevant/noise

Return strict JSON:
{
 "relevance_0_100":0,
 "purchase_intent_0_100":0,
 "pain_intensity_0_100":0,
 "exact_solution_evidence_0_100":0,
 "substitute_evidence_0_100":0,
 "competition_evidence_0_100":0,
 "evidence_kind":"pain|purchase_intent|exact_supply|substitute_supply|price|competition|review|noise",
 "facts":{"price_eur":null,"availability":null,"brand":null,"product_or_service":null},
 "summary":"short factual evidence statement",
 "noise_risk":""
}
High competition is not automatically bad; high demand is not automatically good.
The target is low/weak Greek solution supply against strong monetizable pain."""

ASSESSOR="""You are the Greek Pain-Gap Opportunity Judge.
Your task is NOT to rank generic popular products. Your task is to determine whether a real Greek
pain/problem has commercially attractive unmet or poorly served demand.

You receive a problem plus retrieved evidence documents from BestPrice, Skroutz, Greek web,
social/public sources. BestPrice is a required market reference when evidence exists.

Reason in this order:
1. Is the pain real, expensive, urgent or operationally costly?
2. Is there buyer intent or willingness to pay?
3. How many exact Greek solutions are visible?
4. Are there functional substitutes and are they good enough?
5. Is the category crowded/commodity-like or underserved/specialist?
6. Is there evidence of a price gap, quality gap, availability gap, feature gap, trust gap or service gap?
7. Would an AliExpress/direct-source solution plausibly convert in Greece?
8. What evidence is missing?

Do not use deterministic filters. Do not infer search volume if not supplied.
Do not confuse social virality with purchase intent.
Return strict JSON:
{
 "lifecycle":"DISCOVERED|EMERGING|RISING|ESTABLISHED|PEAKING|DECLINING|UNKNOWN",
 "demand_state":"HIGH|MEDIUM|LOW|UNKNOWN",
 "pain_state":"HIGH|MEDIUM|LOW|UNKNOWN",
 "supply_state":"UNDERSERVED|PARTIAL|WELL_SERVED|UNKNOWN",
 "competition_state":"LOW|MEDIUM|HIGH|UNKNOWN",
 "exact_match_state":"FEW|SOME|MANY|UNKNOWN",
 "substitute_state":"WEAK|ADEQUATE|STRONG|UNKNOWN",
 "price_gap_state":"POSITIVE|NEUTRAL|NEGATIVE|UNKNOWN",
 "buyer_intent_state":"HIGH|MEDIUM|LOW|UNKNOWN",
 "conversion_opportunity":"PROMISING|TEST|WEAK|UNKNOWN",
 "confidence_0_100":0,
 "thesis":"why this can be a Greek commerce opportunity",
 "counter_thesis":"strongest reason it may fail",
 "next_actions":["specific evidence to collect next"]
}"""

def collect_topic(topic:dict[str,Any])->list[dict[str,Any]]:
    now=datetime.now(timezone.utc).isoformat()
    title=normalized_topic(topic)
    pain=str(topic.get("problem_description") or title)
    docs=[]
    seen=set()
    for source_name,family,domain,templates in SOURCE_PLANS:
        for tmpl in templates:
            q=tmpl.format(topic=title,pain=pain)
            try:results=search(q)
            except Exception as e:
                print(json.dumps({"event":"source_error","source":source_name,"error":str(e)[:250]}))
                continue
            for result in results:
                url=str(result.get("url") or "").strip()
                if not url or url in seen: continue
                seen.add(url)
                raw={"title":str(result.get("title") or ""),"content":str(result.get("content") or ""),
                     "url":url,"engine":result.get("engine"),"publishedDate":result.get("publishedDate")}
                try:cls=ai_json(CLASSIFIER,{"problem":topic,"source_name":source_name,"source_family":family,"query":q,"result":raw})
                except Exception as e:cls={"evidence_kind":"noise","summary":"","noise_risk":str(e)[:250]}
                facts=cls.get("facts") or {}
                doc={
                  "market_code":"GR","problem_cluster_id":topic["id"],"source_family":family,"source_name":source_name,
                  "source_url":url,"title":raw["title"][:1000],"snippet":raw["content"][:5000],"query_text":q,
                  "evidence_kind":str(cls.get("evidence_kind") or "market_evidence"),
                  "purchase_intent":float(cls.get("purchase_intent_0_100") or 0)/100,
                  "pain_intensity":float(cls.get("pain_intensity_0_100") or 0)/100,
                  "exact_solution_evidence":float(cls.get("exact_solution_evidence_0_100") or 0)/100,
                  "substitute_evidence":float(cls.get("substitute_evidence_0_100") or 0)/100,
                  "competition_evidence":float(cls.get("competition_evidence_0_100") or 0)/100,
                  "price_evidence":{"price_eur":facts.get("price_eur")},
                  "availability_evidence":{"availability":facts.get("availability")},
                  "extracted_facts":{"classification":cls,"engine":raw["engine"],"publishedDate":raw["publishedDate"]},
                  "content_hash":content_hash(url,raw["title"],raw["content"]),
                  "observed_at":raw["publishedDate"] or now
                }
                try:
                    saved=db_call("POST","ai_market_evidence_documents",data=doc,
                      prefer="resolution=merge-duplicates,return=representation")
                    if isinstance(saved,list) and saved: doc["id"]=saved[0].get("id")
                except Exception:
                    # Evidence may already exist; retrieve it for RAG context.
                    existing=list(db_call("GET","ai_market_evidence_documents",params={
                      "select":"id","problem_cluster_id":f"eq.{topic['id']}",
                      "source_url":f"eq.{url}","evidence_kind":f"eq.{doc['evidence_kind']}","limit":"1"}) or [])
                    if existing: doc["id"]=existing[0]["id"]
                docs.append(doc)
    return docs

def assess(topic:dict[str,Any],docs:list[dict[str,Any]]):
    compact=[]
    for d in docs[:80]:
      compact.append({
        "id":d.get("id"),"source":d["source_name"],"family":d["source_family"],
        "title":d["title"],"snippet":d["snippet"][:1200],"url":d["source_url"],
        "kind":d["evidence_kind"],"purchase_intent":d["purchase_intent"],
        "pain_intensity":d["pain_intensity"],"exact_solution":d["exact_solution_evidence"],
        "substitute":d["substitute_evidence"],"competition":d["competition_evidence"],
        "price":d["price_evidence"],"availability":d["availability_evidence"]
      })
    result=ai_json(ASSESSOR,{"problem":topic,"evidence_documents":compact})
    ids=[d.get("id") for d in docs if d.get("id")]
    db_call("POST","ai_greek_gap_assessments",data={
      "problem_cluster_id":topic["id"],"market_code":"GR",
      "lifecycle":result.get("lifecycle"),"demand_state":result.get("demand_state"),
      "pain_state":result.get("pain_state"),"supply_state":result.get("supply_state"),
      "competition_state":result.get("competition_state"),"exact_match_state":result.get("exact_match_state"),
      "substitute_state":result.get("substitute_state"),"price_gap_state":result.get("price_gap_state"),
      "buyer_intent_state":result.get("buyer_intent_state"),"conversion_opportunity":result.get("conversion_opportunity"),
      "confidence":float(result.get("confidence_0_100") or 0)/100,
      "evidence_count":len(docs),"evidence_ids":ids,
      "thesis":result.get("thesis"),"counter_thesis":result.get("counter_thesis"),
      "next_actions":result.get("next_actions") or [],"raw_output":result
    },prefer="return=minimal")
    return result

def main():
    total_docs=0;assessments=0
    for topic in topics():
      docs=collect_topic(topic)
      total_docs+=len(docs)
      if docs:
        try:
          out=assess(topic,docs); assessments+=1
          print(json.dumps({"event":"gap_assessed","problem":topic.get("problem_key"),
                            "documents":len(docs),"opportunity":out.get("conversion_opportunity"),
                            "confidence":out.get("confidence_0_100")},ensure_ascii=False))
        except Exception as e:
          print(json.dumps({"event":"assessment_error","problem":topic.get("problem_key"),"error":str(e)[:300]}))
    print(json.dumps({"event":"pain_gap_harvest_complete","documents":total_docs,"assessments":assessments}))
if __name__=="__main__":main()
