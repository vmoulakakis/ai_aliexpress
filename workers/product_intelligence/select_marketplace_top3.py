#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"workers"/"product_intelligence"))
from deep_marketplace_research import latest_gaps, problem, candidate_pool, select_top3, persist_selection

def main():
    seen=set(); results=[]
    for gap in latest_gaps():
      pid=gap.get("problem_cluster_id")
      if not pid or pid in seen: continue
      seen.add(pid)
      p=problem(pid)
      if not p: continue
      candidates=candidate_pool(pid)
      selected=select_top3(p,gap,candidates) if candidates else []
      persist_selection(pid,selected)
      results.append({"problem":p["problem_key"],"candidates":len(candidates),"selected":len(selected),
                      "roles":[x.get("role") for x in selected]})
      print(json.dumps({"event":"top3_selected",**results[-1]},ensure_ascii=False))
    print(json.dumps({"event":"selection_complete","problems":len(results),
                      "selected_total":sum(x["selected"] for x in results)},ensure_ascii=False))

if __name__=="__main__": main()
