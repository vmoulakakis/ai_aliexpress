#!/usr/bin/env python3
from __future__ import annotations
import json,os,sys
from datetime import datetime,timezone
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call  # noqa:E402

SEARX=os.getenv("SEARXNG_BASE_URL","http://127.0.0.1:8080").rstrip("/")
MODEL_ENDPOINT="https://models.github.ai/inference/chat/completions"
MODEL=os.getenv("DEMAND_AGENT_MODEL","openai/gpt-4.1-mini")
TOKEN=os.getenv("GITHUB_TOKEN","")
TOPIC_LIMIT=int(os.getenv("DEMAND_TOPIC_LIMIT","20"))

SOURCES=[
 ("search","google_web",None,["τιμή","αγορά","πού θα βρω"]),
 ("greek_marketplace","skroutz","skroutz.gr",["τιμή","κριτικές","αγορά"]),
 ("greek_marketplace","bestprice","bestprice.gr",["τιμή","αγορά"]),
 ("social","reddit","reddit.com",["Greece","Ελλάδα","buy"]),
 ("social","youtube","youtube.com",["Greece","review","2026"]),
 ("social","tiktok","tiktok.com",["Greece","review","viral"]),
]

def ai_json(system:str,payload:Any):
    if not TOKEN:return {}
    r=requests.post(MODEL_ENDPOINT,headers={"Authorization":f"Bearer {TOKEN}","Content-Type":"application/json"},
      json={"model":MODEL,"temperature":0.1,"response_format":{"type":"json_object"},
            "messages":[{"role":"system","content":system},{"role":"user","content":json.dumps(payload,ensure_ascii=False)}]},timeout=90)
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])

def search(q):
    r=requests.get(f"{SEARX}/search",params={"q":q,"format":"json","language":"el-GR"},timeout=45);r.raise_for_status()
    return list(r.json().get("results") or [])[:8]

def topics():
    return list(db_call("GET","market_problem_clusters",params={
      "select":"id,problem_key,problem_title,problem_description,target_customer,category",
      "market_code":"eq.GR","order":"updated_at.desc","limit":str(TOPIC_LIMIT)}) or [])

def main():
    count=0;now=datetime.now(timezone.utc).isoformat()
    system="""You classify public evidence for Greek commerce demand. Use only the supplied result.
Return strict JSON {relevance_0_100,purchase_intent_0_100,confidence_0_100,signal_type,evidence_summary,noise_risk}.
Never invent search volume, sales, rankings or metrics. Viral attention is not automatically purchase demand."""
    for topic in topics():
      title=topic.get("problem_title") or topic.get("problem_key")
      for family,name,domain,mods in SOURCES:
        q=f'"{title}" ('+" OR ".join(f'"{m}"' for m in mods)+")"+(f" site:{domain}" if domain else "")
        try:results=search(q)
        except Exception as e:
          print(json.dumps({"event":"source_error","source":name,"error":str(e)[:250]}));continue
        for result in results:
          url=str(result.get("url") or "")
          if not url:continue
          try:cls=ai_json(system,{"topic":topic,"source_family":family,"source_name":name,"result":result})
          except Exception as e:cls={"confidence_0_100":0,"noise_risk":str(e)[:250]}
          db_call("POST","ai_demand_signals",data={
            "market_code":"GR","topic_key":str(topic.get("problem_key") or topic["id"]),
            "problem_cluster_id":topic["id"],"source_family":family,"source_name":name,
            "signal_type":str(cls.get("signal_type") or "public_evidence"),
            "observed_value":{"title":result.get("title"),"engine":result.get("engine"),"publishedDate":result.get("publishedDate")},
            "evidence_url":url,"evidence_text":str(result.get("content") or "")[:4000],
            "observed_at":result.get("publishedDate") or now,
            "ai_relevance":float(cls.get("relevance_0_100") or 0)/100,
            "ai_purchase_intent":float(cls.get("purchase_intent_0_100") or 0)/100,
            "ai_confidence":float(cls.get("confidence_0_100") or 0)/100,
            "metadata":{"classification":cls,"query":q}},prefer="return=minimal")
          count+=1
    print(json.dumps({"event":"demand_harvest_complete","signals":count}))
if __name__=="__main__":main()
