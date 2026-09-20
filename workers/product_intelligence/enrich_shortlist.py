#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,time
from workers.product_intelligence.enrich_eligible import (
    api_detail,public_page_probe,store_snapshot,candidate,discoveries,problems,latest_gap,
    existing_reviews,synthesize,TOKEN
)
from workers.shared.db_gateway import db_call

def shortlist(limit:int):
    return list(db_call("GET","ai_pain_product_shortlist",params={
      "select":"problem_cluster_id,product_candidate_id,offer_id,rank",
      "order":"problem_cluster_id.asc,rank.asc","limit":str(limit)}) or [])

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--limit",type=int,default=150)
    args=ap.parse_args()
    rows=shortlist(args.limit)
    stats={"shortlisted":len(rows),"details":0,"intel":0,"errors":0}
    for row in rows:
      try:
        cand=candidate(row["product_candidate_id"])
        source_id=str(cand.get("source_product_id") or "")
        if not source_id: continue
        detail=api_detail(source_id);stats["details"]+=1 if detail else 0
        probe=public_page_probe(source_id)
        store_snapshot(row["product_candidate_id"],row.get("offer_id"),detail,probe)
        ds=discoveries(row["product_candidate_id"])
        probs=problems(ds)
        # Ensure the selected pain is first if discovery order differs.
        target=str(row.get("problem_cluster_id") or "")
        probs=sorted(probs,key=lambda p:0 if str(p.get("id"))==target else 1)
        gap=latest_gap(target)
        reviews=existing_reviews(row["product_candidate_id"])
        if TOKEN:
          synthesize(
            {"product_candidate_id":row["product_candidate_id"],"offer_id":row.get("offer_id")},
            cand,detail,ds,probs,gap,reviews,probe
          )
          stats["intel"]+=1
        time.sleep(.15)
      except Exception as exc:
        stats["errors"]+=1
        print(json.dumps({"event":"shortlist_enrichment_error","product_candidate_id":row.get("product_candidate_id"),"error":str(exc)[:500]}))
    print(json.dumps({"event":"shortlist_enrichment_complete",**stats}))

if __name__=="__main__":main()
