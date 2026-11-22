#!/usr/bin/env python3
"""Conservative, auditable marketplace discovery. Never infer absence from zero search results."""
from __future__ import annotations
import argparse,json,os,re,sys,time
from datetime import datetime,timedelta,timezone
from pathlib import Path
from urllib.parse import urlparse
import requests

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"shared"))
from db_gateway import db_call

DOMAINS={
 "GR":[("amazon.de","marketplace"),("skroutz.gr","marketplace"),("bestprice.gr","marketplace"),("grobotronics.com","specialist"),("gr.rs-online.com","specialist")],
 "DE":[("amazon.de","marketplace"),("ebay.de","marketplace"),("kaufland.de","marketplace"),("conrad.de","specialist"),("reichelt.de","specialist")],
 "FR":[("amazon.fr","marketplace"),("cdiscount.com","marketplace"),("ebay.fr","marketplace"),("manomano.fr","specialist"),("fr.rs-online.com","specialist")],
 "IE":[("amazon.ie","marketplace"),("ebay.ie","marketplace"),("adverts.ie","marketplace"),("ie.rs-online.com","specialist"),("ie.farnell.com","specialist")]
}
SEARXNG=os.getenv("SEARXNG_BASE_URL","http://127.0.0.1:8080").rstrip("/")
STOP={"with","from","the","for","new","and","hot","smart","tool","professional","kit","high","digital","portable","mini","wireless","electric","home"}
def normalized(v:str)->str:
    return re.sub(r"[^a-z0-9 ]+"," ",str(v or "").casefold()).strip()
def query_words(title:str)->list[str]:
    return [x for x in normalized(title).split() if len(x)>2 and x not in STOP][:10]
def search(site:str,title:str,timeout:int=15):
    words=query_words(title)
    if len(words)<2:return {"status":"insufficient_identity","results":[]}
    term=" ".join(words[:7])
    q=f"site:{site} {term}"
    try:
        res=requests.get(SEARXNG+"/search",params={"q":q,"format":"json","language":"all"},
                         timeout=timeout)
        res.raise_for_status()
        payload=res.json()
        hits=[{"url":h.get("url"),"title":str(h.get("title") or "")[:200],
               "snippet":str(h.get("content") or "")[:300]} for h in (payload.get("results") or [])[:6]
               if isinstance(h,dict) and isinstance(h.get("url"),str)
               and (urlparse(h["url"]).hostname or "").endswith(site)]
        return {"status":"searched","query":q,"results":hits}
    except Exception as e:return {"status":"research_error","error":type(e).__name__,"query":q,"results":[]}
def matching(title:str,hits:list[dict]):
    identity=set(query_words(title))
    model_tokens={t for t in identity if any(c.isdigit() for c in t) and len(t)>3}
    for item in hits:
        h=set(normalized(item.get("title","")).split())
        if model_tokens and model_tokens.intersection(h) and len(identity.intersection(h))>=4:
            return "exact_found"
        if len(identity)>=5 and len(identity.intersection(h))>=5:
            return "functional_substitute_found"
    return "unverified"
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--market",choices=list(DOMAINS),required=True)
    ap.add_argument("--limit",type=int,default=12)
    args=ap.parse_args()
    offers=db_call("GET","ai_europe_offer_commissions_v",params={
      "select":"source_product_id,simple_estimate_eur",
      "simple_estimate_eur":"gt.10","order":"simple_estimate_eur.desc",
      "limit":str(max(1,min(args.limit*4,100)))}) or []
    ids=list(dict.fromkeys(str(x["source_product_id"]) for x in offers if x.get("source_product_id")))[:args.limit]
    if not ids:
        print(json.dumps({"event":"no_commission_candidates","market":args.market}));return
    items=db_call("GET","ai_product_candidates",params={
      "select":"source_product_id,title,category",
      "source_product_id":"in.("+",".join(ids)+")","limit":str(len(ids))}) or []
    summary={"market":args.market,"candidates":len(items),"checks":0,"errors":0,"exact_found":0,"completed":0}
    now=datetime.now(timezone.utc)
    for p in items:
        pid,title=str(p["source_product_id"]),str(p["title"])
        if len(query_words(title))<2:continue
        status_counts={}
        marketplace_checks=specialist_checks=0
        urls=[]
        for site,kind in DOMAINS[args.market]:
            evidence=search(site,title)
            match=matching(title,evidence.get("results",[])) if evidence["status"]=="searched" else "research_error"
            if evidence["status"]=="searched":
                if kind=="marketplace":marketplace_checks+=1
                else:specialist_checks+=1
            else:summary["errors"]+=1
            if match=="exact_found":summary["exact_found"]+=1
            status_counts[match]=status_counts.get(match,0)+1
            urls.extend(h["url"] for h in evidence["results"][:2] if h.get("url"))
            record={"source_product_id":pid,"country_code":args.market,"marketplace_name":site,
                "marketplace_url":"https://"+site,"checked_at":now.isoformat(),
                "match_status":match,"check_method":"authorized_search",
                "search_terms":[evidence.get("query","")],
                "evidence":{"query":evidence.get("query"),"search_status":evidence["status"],
                            "results":evidence.get("results",[]),"research_error":evidence.get("error"),
                            "interpretation":"Search results are hypotheses; zero hits do not prove marketplace absence"},
                "reviewer":"nightly_auto_v1","expires_at":(now+timedelta(days=7)).isoformat()}
            db_call("POST","ai_europe_market_checks",data=record,prefer="return=minimal")
            summary["checks"]+=1
            time.sleep(.18)
        # Never certify 'hard_to_find' from a search-engine negative alone.
        # Report this as research_incomplete until individual product matches are reviewed.
        result="widely_available" if status_counts.get("exact_found",0)>=3 else "research_incomplete"
        assessment={"source_product_id":pid,"country_code":args.market,
            "scarcity_status":result,"evaluated_at":now.isoformat(),
            "expires_at":(now+timedelta(days=7)).isoformat(),
            "checked_marketplaces":marketplace_checks,"checked_specialist_shops":specialist_checks,
            "exact_match_count":status_counts.get("exact_found",0),
            "functional_substitute_count":status_counts.get("functional_substitute_found",0),
            "evidence_urls":list(dict.fromkeys(urls))[:20],
            "reviewer":"nightly_auto_v1","updated_at":now.isoformat()}
        db_call("POST","ai_europe_scarcity_assessments",
            params={"on_conflict":"source_product_id,country_code"},data=assessment,
            prefer="resolution=merge-duplicates,return=minimal")
        summary["completed"]+=1
        print(json.dumps({"event":"market_research_result","product_id":pid,"market":args.market,
             "status":result,"sources_checked":summary["checks"],"matches":status_counts}))
    print(json.dumps({"event":"nightly_eu_market_research_complete",**summary}))
if __name__=="__main__":main()
