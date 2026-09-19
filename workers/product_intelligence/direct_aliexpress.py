#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,os,sys,time
from datetime import datetime,timezone
from decimal import Decimal,InvalidOperation
from pathlib import Path
from typing import Any
import requests

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"shared"))
from db_gateway import db_call  # noqa:E402

ALIEXPRESS_GATEWAY=os.getenv("ALIEXPRESS_GATEWAY","https://gqpbskssrvpfjtujwezc.supabase.co/functions/v1/direct-aliexpress")
MARKET=os.getenv("MARKET_CODE","GR")
MIN_COMMISSION_EUR=Decimal("10")
PAGE_SIZE=min(50,max(1,int(os.getenv("ALIEXPRESS_PAGE_SIZE","30"))))
TIMEOUT=int(os.getenv("ALIEXPRESS_TIMEOUT_SECONDS","90"))

def num(v:Any)->Decimal|None:
    if v is None:return None
    try:return Decimal(str(v).replace("€","").replace(",",".").replace("%","").strip())
    except InvalidOperation:return None

def rate(v:Any)->Decimal|None:
    n=num(v)
    if n is None:return None
    return n/Decimal("100") if n>1 else n

def commission(price:Any,commission_rate:Any)->Decimal|None:
    p,r=num(price),rate(commission_rate)
    return None if p is None or r is None else (p*r).quantize(Decimal("0.01"))

def call_api(payload:dict[str,Any])->dict[str,Any]:
    r=requests.post(ALIEXPRESS_GATEWAY,json=payload,timeout=TIMEOUT)
    r.raise_for_status()
    body=r.json()
    if not body.get("ok"):raise RuntimeError(body)
    return body.get("data") or {}

def upsert_product(p:dict[str,Any])->dict[str,Any]:
    pid,title=str(p.get("product_id") or "").strip(),str(p.get("product_title") or "").strip()
    if not pid or not title:raise ValueError("missing_product_identity")
    now=datetime.now(timezone.utc).isoformat()
    rows=db_call("POST","ai_product_candidates",
      params={"on_conflict":"source_key,source_product_id","select":"id,source_product_id"},
      data={"source_key":"aliexpress","source_product_id":pid,"title":title,
            "product_url":p.get("product_detail_url"),"image_url":p.get("product_main_image_url"),
            "category":p.get("second_level_category_name"),"raw_payload":p,
            "last_seen_at":now,"observed_at":now},
      prefer="resolution=merge-duplicates,return=representation")
    return rows[0]

def upsert_offer(product_id:str,p:dict[str,Any])->Decimal|None:
    price=num(p.get("sale_price"));r=rate(p.get("commission_rate"));c=commission(price,r)
    shop_id=str(p.get("shop_id") or "unknown")
    now=datetime.now(timezone.utc).isoformat()
    db_call("POST","ai_product_offers",
      params={"on_conflict":"product_candidate_id,source_offer_key"},
      data={"product_candidate_id":product_id,"source_offer_key":f"{p.get('product_id')}:{shop_id}",
            "seller_source_id":None if shop_id=="unknown" else shop_id,"seller_url":p.get("shop_url"),
            "price_eur":float(price) if price is not None else None,
            "original_price_eur":float(num(p.get("original_price"))) if num(p.get("original_price")) is not None else None,
            "commission_rate":float(r) if r is not None else None,
            "expected_commission_eur":float(c) if c is not None else None,
            "promotion_url":p.get("promotion_link"),
            "seller_evidence":{"evaluate_rate":p.get("evaluate_rate"),"shop_id":p.get("shop_id"),"shop_url":p.get("shop_url")},
            "logistics_evidence":{"ship_to_days":p.get("ship_to_days")},
            "raw_payload":p,"last_seen_at":now,"observed_at":now},
      prefer="resolution=merge-duplicates,return=minimal")
    return c

def active_queries(limit:int):
    return list(db_call("GET","ai_source_queries",params={
      "select":"id,query_text,problem_cluster_id,hypothesis,priority",
      "status":"eq.active","order":"priority.desc.nullslast,updated_at.desc","limit":str(limit)}) or [])

def run_query(row,pages:int):
    stats={"seen":0,"stored":0,"promotion_eligible":0}
    for page in range(1,pages+1):
        data=call_api({"action":"search","keywords":row["query_text"],"ship_to":MARKET,"currency":"EUR",
                       "page":page,"page_size":PAGE_SIZE,"sort":"LAST_VOLUME_DESC"})
        products=list(data.get("products") or [])
        if not products:break
        for p in products:
            stats["seen"]+=1
            try:
                saved=upsert_product(p);c=upsert_offer(saved["id"],p);stats["stored"]+=1
                if c is not None and c>=MIN_COMMISSION_EUR:stats["promotion_eligible"]+=1
            except Exception as exc:
                print(json.dumps({"event":"candidate_error","error":str(exc)[:400]}))
        time.sleep(.15)
    now=datetime.now(timezone.utc).isoformat()
    db_call("PATCH","ai_source_queries",params={"id":f"eq.{row['id']}"},
            data={"last_run_at":now,"updated_at":now},prefer="return=minimal")
    return stats

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--queries",type=int,default=30);ap.add_argument("--pages",type=int,default=2)
    args=ap.parse_args();queries=active_queries(args.queries)
    total={"queries":len(queries),"seen":0,"stored":0,"promotion_eligible":0}
    for q in queries:
        st=run_query(q,max(1,args.pages))
        for k in ("seen","stored","promotion_eligible"):total[k]+=st[k]
    print(json.dumps({"event":"run_complete",**total}))
if __name__=="__main__":main()
