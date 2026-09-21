"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import type {Product,CategoryAllocation,SubcategoryAllocation} from "../lib/products";
import {compactTitle,money,n} from "../lib/products";
import {directProduct} from "../lib/siteDirector";

const stateLabel=(p:Product)=>{
  if(p.publication_tier==="VERIFIED_PAIN_WINNER") return ["Verified pain winner","good"];
  const o=(p.greek_gap_opportunity||"").toUpperCase();
  if(o==="PROMISING") return ["AI category pick","good"];
  if(o==="TEST") return ["AI category pick","warn"];
  return ["AI category pick","muted"];
};
const roleLabel=(v:any)=>String(v||"category_solution").replaceAll("_"," ").toUpperCase();

export default function Marketplace({products,categories,subcategories,mode}:{products:Product[];categories:CategoryAllocation[];subcategories:SubcategoryAllocation[];mode:string}){
  const [q,setQ]=useState("");
  const [category,setCategory]=useState("ALL");
  const [problem,setProblem]=useState("ALL");
  const [limit,setLimit]=useState(20);

  const uniqueProducts=useMemo(()=>{
    const seen=new Set<string>();
    return products.filter(p=>{
      const k=(p.publication_tier==="AI_CATEGORY_TOP10"?(p.problem_category||"")+"|":"")+(p.product_candidate_id||"")+"|"+(p.offer_id||"");
      if(seen.has(k)) return false; seen.add(k); return true;
    });
  },[products]);

  const productCounts=useMemo(()=>{
    const m=new Map<string,number>();
    uniqueProducts.forEach(p=>{const k=p.problem_category||"Other";m.set(k,(m.get(k)||0)+1)});
    return m;
  },[uniqueProducts]);

  const readyCategories=useMemo(()=>new Set([...productCounts.entries()].filter(([,count])=>count>=10).map(([name])=>name)),[productCounts]);
  const demandCategories=useMemo(()=>categories.filter(c=>c.product_capacity>0&&readyCategories.has(c.category)),[categories,readyCategories]);
  const categorySubs=useMemo(()=>subcategories.filter(s=>readyCategories.has(s.category)&&(category==="ALL"||s.category===category)).slice(0,16),[subcategories,category,readyCategories]);
  const problems=useMemo(()=>{
    const m=new Map<string,string>();
    uniqueProducts.filter(p=>category==="ALL"||p.problem_category===category).forEach(p=>{
      if(p.problem_key&&p.problem_title)m.set(p.problem_key,p.problem_title)
    });
    return [...m.entries()];
  },[uniqueProducts,category]);

  const selectedProblemCategory=useMemo(()=>{
    if(problem==="ALL") return null;
    return uniqueProducts.find(p=>p.problem_key===problem)?.problem_category||null;
  },[uniqueProducts,problem]);

  const visible=useMemo(()=>{
    const base=uniqueProducts.filter(p=>{
      const text=(p.title+" "+(p.problem_title||"")+" "+(p.target_customer||"")+" "+(p.problem_category||"")+" "+(p.problem_subcategory||"")).toLowerCase();
      return (!q||text.includes(q.toLowerCase()))&&(category==="ALL"||p.problem_category===category);
    });
    if(problem==="ALL") return base;
    const direct=base.filter(p=>p.problem_key===problem);
    if(direct.length) return direct;
    const fallbackCategory=selectedProblemCategory||category;
    return base.filter(p=>(fallbackCategory==="ALL"||p.problem_category===fallbackCategory)&&p.publication_tier==="AI_CATEGORY_TOP10");
  },[uniqueProducts,q,category,problem,selectedProblemCategory]);

  const chooseCategory=(c:string)=>{setCategory(c);setProblem("ALL");setLimit(20)};
  const verifiedCount=useMemo(()=>uniqueProducts.filter(p=>p.publication_tier==="VERIFIED_PAIN_WINNER").length,[uniqueProducts]);
  const fallbackCount=uniqueProducts.length-verifiedCount;

  return <main className="market">
    <section className="marketHero shell">
      <div className="marketHeroCopy reveal">
        <p className="kicker">AI DEMAND → DEEP ALIEXPRESS RESEARCH → TOP 10 / CATEGORY → MAX 3 VERIFIED / PAIN</p>
        <h1>Δεν ψάχνεις προϊόν.<br/><em>Ψάχνεις λύση που αξίζει.</em></h1>
        <p className="heroBody">Κάθε demand category πρέπει να έχει επιλογές. Οι agents ψάχνουν βαθιά στο AliExpress μέχρι να χτίσουν Top‑10 category shelf και, μέσα σε αυτό το universe, ξεχωρίζουν έως 3 verified winners για κάθε pain όταν το evidence είναι αρκετό.</p>
        <div className="searchBar"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Γράψε πρόβλημα, χρήση, category ή προϊόν…" aria-label="Αναζήτηση marketplace"/><b>{visible.length}</b></div>
      </div>
      <div className="marketOrbit reveal delay1">
        <div className="orbitCore"><span>{mode.includes("HYBRID")?"HYBRID AI":"AI MARKET"}</span><strong>{uniqueProducts.length}</strong><small>AI-selected solutions</small></div>
        <div className="orbitTag t1">Top 10 / category</div><div className="orbitTag t2">{verifiedCount} verified</div><div className="orbitTag t3">{fallbackCount} category picks</div><div className="orbitTag t4">€10+ promoted gate</div>
      </div>
    </section>

    <section className="proofStrip">
      <div><b>01</b><span>Greek demand</span></div><i>→</i><div><b>02</b><span>Category quota</span></div><i>→</i><div><b>03</b><span>Deep AliExpress search</span></div><i>→</i><div><b>04</b><span>Top 10 shelf</span></div><i>→</i><div><b>05</b><span>Evidence</span></div><i>→</i><div><b>06</b><span>Verified winners</span></div>
    </section>

    <section id="demand" className="shell demandMap reveal">
      <div className="sectionHead demandHead">
        <div><p className="kicker">DEMAND-DRIVEN INVENTORY</p><h2>Κάθε category πρέπει να έχει λύσεις.</h2></div>
        <p>Το AI δεν σταματά επειδή οι πρώτες αναζητήσεις ήταν αδύναμες. Categories με λιγότερες από 10 πραγματικές solution candidates παίρνουν μεγαλύτερο query budget, περισσότερες AliExpress σελίδες και broader mechanism search μέχρι να γεμίσει το Top‑10. Το €10 commission gate εφαρμόζεται μόνο στο promoted/verified tier.</p>
      </div>
      <div className="demandGrid">
        {demandCategories.map(c=>{
          const active=category===c.category;
          return <button key={c.category} className={"demandCard "+(active?"active":"")} onClick={()=>chooseCategory(active?"ALL":c.category)}>
            <span>{c.category}</span><strong>{Math.round(n(c.avg_demand_score))}</strong><small>AI demand / 100</small>
            <div><b>{Math.min(10,productCounts.get(c.category)||0)}</b>/10 shelf <i>·</i> <b>{c.active_pains}</b> pains</div>
          </button>
        })}
      </div>
      <div className="subDemand">
        {categorySubs.map(s=><div key={s.category+"-"+s.subcategory}><span>{s.category} / {s.subcategory}</span><b>{Math.round(n(s.avg_demand_score))}</b><small>{s.active_pains} active pain{s.active_pains===1?"":"s"}</small></div>)}
      </div>
    </section>

    <section className="shell problemHub reveal">
      <div className="sectionTitle"><p className="kicker">START WITH THE PAIN</p><h2>Διάλεξε το πρόβλημα — όχι το προϊόν.</h2></div>
      <div className="chips">
        <button className={problem==="ALL"?"active":""} onClick={()=>{setProblem("ALL");setLimit(20)}}>Όλα τα pains</button>
        {problems.map(([k,t])=><button key={k} className={problem===k?"active":""} onClick={()=>{setProblem(k);setLimit(20)}}>{t}</button>)}
      </div>
    </section>

    <section id="market" className="shell productSection">
      <div className="sectionHead">
        <div><p className="kicker">AI SOLUTION MARKETPLACE</p><h2>{visible.length} AI-selected λύσεις</h2></div>
        <p>{problem==="ALL"?"Top‑10 category shelves μαζί με τα verified pain winners.":"Αν δεν υπάρχει verified winner για το συγκεκριμένο pain, εμφανίζονται τα καλύτερα AI category picks της ίδιας αγοράς — όχι κενή σελίδα."}</p>
      </div>
      <div className="productGrid">
        {visible.slice(0,limit).map((p,i)=>{
          const [lab,cls]=stateLabel(p);
          const conf=Math.round(n(p.intelligence_confidence||p.selection_confidence)*100);
          const demand=Math.round(n(p.demand_allocation_score));
          const tier=p.publication_tier==="VERIFIED_PAIN_WINNER"?"VERIFIED":"CATEGORY TOP 10";
          const direction=directProduct(p);
          return <Link href={"/product/"+p.source_product_id} className="productCard reveal" style={{animationDelay:`${Math.min(i,12)*35}ms`}} key={(p.product_candidate_id||"")+"|"+(p.offer_id||"")}>
            <div className="imageStage">
              {p.image_url?<img src={p.image_url} alt={p.title} loading="lazy" decoding="async"/>:<div className="imageFallback">NO IMAGE</div>}
              <span className={"gapBadge "+cls}>{lab}</span><span className="passportMini">{tier} ↗</span>
            </div>
            <div className="cardBody">
              <p className="categoryLine">{p.problem_category||"Opportunity"}{p.problem_subcategory?" / "+p.problem_subcategory:""} · demand {demand||"—"}</p>
              <p className="painLabel">{direction.cardHook}</p><h3>{compactTitle(p.title)}</h3>
              <div className="cardMeta"><strong>{money(p.price_eur)}</strong><span>{(p.sold_count||0)>0?`${p.sold_count} observed sales`:"AI evidence review"}</span></div>
              <div className="proofBars"><div><span>Demand</span><b style={{width:`${Math.max(12,demand)}%`}}></b></div><div><span>Evidence</span><b style={{width:`${Math.max(18,conf)}%`}}></b></div></div>
              <div className="cardBottom"><span>#{p.selection_rank||"?"} · {direction.trigger.replaceAll("_"," ")}</span><b>Δες πώς λύνει το πρόβλημα →</b></div>
            </div>
          </Link>
        })}
      </div>
      {!visible.length&&<div className="emptyState"><b>Η category βρίσκεται σε ενεργό AI research expansion.</b><span>Οι agents συνεχίζουν AliExpress discovery μέχρι να υπάρχει πλήρες Top‑10. Το €10 gate παραμένει μόνο για promoted/verified επιλογές.</span></div>}
      {limit<visible.length&&<div className="loadMoreWrap"><button className="loadMore" onClick={()=>setLimit(v=>v+20)}>Δείξε άλλες {Math.min(20,visible.length-limit)} λύσεις <span>↓</span></button><small>{limit} από {visible.length}</small></div>}
    </section>

    <section id="proof" className="shell trustManifest reveal">
      <div><p className="kicker">TWO-TIER AI SELECTION</p><h2>Πάντα λύσεις. Διαφορετικό confidence.</h2></div>
      <div className="manifestGrid">
        <article><span>10</span><h3>Category shelf</h3><p>Κάθε public demand category έχει 10 πραγματικές AI-ranked λύσεις. Το commission δεν κόβει το discovery shelf· καθορίζει αν μια λύση είναι promotable.</p></article>
        <article><span>≤3</span><h3>Verified pain winners</h3><p>Οι αυστηρότερες 0–3 επιλογές ανά pain παραμένουν ξεχωριστό premium evidence tier.</p></article>
        <article><span>AI</span><h3>Research keeps going</h3><p>Όταν μια category έχει λιγότερους από 10 eligible candidates, ο agent αυξάνει query diversity και research depth αντί να σταματά.</p></article>
      </div>
    </section>
  </main>;
}
