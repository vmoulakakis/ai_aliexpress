"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import type {Product,CategoryAllocation,SubcategoryAllocation} from "../lib/products";
import {compactTitle,money,n} from "../lib/products";

const stateLabel=(p:Product)=>{
  const o=(p.greek_gap_opportunity||"").toUpperCase();
  if(o==="PROMISING") return ["Ισχυρό market gap","good"];
  if(o==="TEST") return ["Χρειάζεται validation","warn"];
  return ["Market evidence","muted"];
};
const roleLabel=(v:any)=>String(v||"PROOF").replaceAll("_"," ").toUpperCase();

export default function Marketplace({products,categories,subcategories,mode}:{products:Product[];categories:CategoryAllocation[];subcategories:SubcategoryAllocation[];mode:string}){
  const [q,setQ]=useState("");
  const [category,setCategory]=useState("ALL");
  const [problem,setProblem]=useState("ALL");
  const [limit,setLimit]=useState(12);

  const productCounts=useMemo(()=>{
    const m=new Map<string,number>();
    products.forEach(p=>{const k=p.problem_category||"Other";m.set(k,(m.get(k)||0)+1)});
    return m;
  },[products]);

  const demandCategories=useMemo(()=>categories.filter(c=>c.product_capacity>0).slice(0,10),[categories]);
  const categorySubs=useMemo(()=>subcategories.filter(s=>category==="ALL"||s.category===category).slice(0,12),[subcategories,category]);
  const problems=useMemo(()=>{
    const m=new Map<string,string>();
    products.filter(p=>category==="ALL"||p.problem_category===category).forEach(p=>{if(p.problem_key&&p.problem_title)m.set(p.problem_key,p.problem_title)});
    return [...m.entries()];
  },[products,category]);

  const visible=useMemo(()=>products.filter(p=>{
    const text=(p.title+" "+(p.problem_title||"")+" "+(p.target_customer||"")+" "+(p.problem_category||"")+" "+(p.problem_subcategory||"")).toLowerCase();
    return (!q||text.includes(q.toLowerCase()))&&(category==="ALL"||p.problem_category===category)&&(problem==="ALL"||p.problem_key===problem);
  }),[products,q,category,problem]);

  const chooseCategory=(c:string)=>{setCategory(c);setProblem("ALL");setLimit(12)};

  return <main className="market">
    <section className="marketHero shell">
      <div className="marketHeroCopy reveal">
        <p className="kicker">AI DEMAND → PAIN → DEEP RESEARCH → MAX 3 WINNERS</p>
        <h1>Δεν ψάχνεις προϊόν.<br/><em>Ψάχνεις την καλύτερη λύση.</em></h1>
        <p className="heroBody">Η ελληνική ζήτηση αποφασίζει πού αξίζει να ψάξουμε βαθύτερα. Για κάθε πραγματικό pain ερευνούμε μεγάλο AliExpress universe, συγκρίνουμε seller, evidence, landed friction και ελληνικές εναλλακτικές και κρατάμε έως 3 ουσιαστικά διαφορετικές λύσεις.</p>
        <div className="searchBar"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Γράψε πρόβλημα, χρήση, category ή προϊόν…" aria-label="Αναζήτηση marketplace"/><b>{visible.length}</b></div>
      </div>
      <div className="marketOrbit reveal delay1">
        <div className="orbitCore"><span>{mode==="CURATED_TOP3"?"CURATED":"RESEARCH"}</span><strong>{products.length}</strong><small>published winners</small></div>
        <div className="orbitTag t1">AI Demand</div><div className="orbitTag t2">Greek gap</div><div className="orbitTag t3">Seller proof</div><div className="orbitTag t4">Max 3 / pain</div>
      </div>
    </section>

    <section className="proofStrip">
      <div><b>01</b><span>AI Demand</span></div><i>→</i><div><b>02</b><span>Category allocation</span></div><i>→</i><div><b>03</b><span>Pain / Gap</span></div><i>→</i><div><b>04</b><span>Deep research</span></div><i>→</i><div><b>05</b><span>Proof</span></div><i>→</i><div><b>06</b><span>0–3 winners</span></div>
    </section>

    <section id="demand" className="shell demandMap reveal">
      <div className="sectionHead demandHead"><div><p className="kicker">ADAPTIVE INVENTORY</p><h2>Το demand αποφασίζει πόσο βαθιά ψάχνουμε.</h2></div><p>Δεν μοιράζουμε ίδιο quota παντού. Η δυναμική κάθε category και subcategory προκύπτει από frozen Greek-demand evidence, pain intensity, urgency και buyer intent. Το capacity είναι ανώτατο research potential — όχι υποχρέωση να γεμίσουν θέσεις.</p></div>
      <div className="demandGrid">
        {demandCategories.map(c=>{
          const active=category===c.category;
          return <button key={c.category} className={"demandCard "+(active?"active":"")} onClick={()=>chooseCategory(active?"ALL":c.category)}>
            <span>{c.category}</span><strong>{Math.round(n(c.avg_demand_score))}</strong><small>AI demand / 100</small>
            <div><b>{productCounts.get(c.category)||0}</b> live <i>·</i> <b>{c.product_capacity}</b> potential</div>
          </button>
        })}
      </div>
      <div className="subDemand">
        {categorySubs.map(s=><div key={s.category+"-"+s.subcategory}><span>{s.category} / {s.subcategory}</span><b>{Math.round(n(s.avg_demand_score))}</b><small>capacity {s.product_capacity}</small></div>)}
      </div>
    </section>

    <section className="shell problemHub reveal">
      <div className="sectionTitle"><p className="kicker">START WITH THE PAIN</p><h2>Τι θέλεις να σταματήσεις να σου κοστίζει;</h2></div>
      <div className="chips">
        <button className={problem==="ALL"?"active":""} onClick={()=>{setProblem("ALL");setLimit(12)}}>Όλα τα pains</button>
        {problems.map(([k,t])=><button key={k} className={problem===k?"active":""} onClick={()=>{setProblem(k);setLimit(12)}}>{t}</button>)}
      </div>
    </section>

    <section id="market" className="shell productSection">
      <div className="sectionHead"><div><p className="kicker">PROOF-FIRST MARKETPLACE</p><h2>{visible.length} AI-selected λύσεις</h2></div><p>Κάθε pain μπορεί να έχει από μηδέν έως τρεις winners. Αν δεν υπάρχει αρκετό evidence ή διαφορετικότητα, δεν γεμίζουμε τεχνητά το marketplace.</p></div>
      <div className="productGrid">
        {visible.slice(0,limit).map((p,i)=>{
          const [lab,cls]=stateLabel(p);const conf=Math.round(n(p.intelligence_confidence)*100);const demand=Math.round(n(p.demand_allocation_score));
          return <Link href={"/product/"+p.source_product_id} className="productCard reveal" style={{animationDelay:`${Math.min(i,12)*35}ms`}} key={p.product_candidate_id}>
            <div className="imageStage">
              {p.image_url?<img src={p.image_url} alt={p.title} loading="lazy" decoding="async"/>:<div className="imageFallback">NO IMAGE</div>}
              <span className={"gapBadge "+cls}>{lab}</span><span className="passportMini">{roleLabel(p.selection_role)} ↗</span>
            </div>
            <div className="cardBody">
              <p className="categoryLine">{p.problem_category||"Opportunity"}{p.problem_subcategory?" / "+p.problem_subcategory:""} · demand {demand||"—"}</p>
              <p className="painLabel">{p.problem_title||"Product intelligence"}</p><h3>{compactTitle(p.title)}</h3>
              <div className="cardMeta"><strong>{money(p.price_eur)}</strong><span>{(p.sold_count||0)>0?`${p.sold_count} observed sales`:"evidence-first review"}</span></div>
              <div className="proofBars"><div><span>Demand</span><b style={{width:`${Math.max(12,demand)}%`}}></b></div><div><span>Evidence</span><b style={{width:`${Math.max(18,conf)}%`}}></b></div></div>
              <div className="cardBottom"><span>#{p.selection_rank||"?"} · {roleLabel(p.selection_role)}</span><b>Δες το Proof Passport →</b></div>
            </div>
          </Link>
        })}
      </div>
      {!visible.length&&<div className="emptyState"><b>Δεν υπάρχει ακόμη winner που να περνά το evidence test.</b><span>Το σύστημα προτιμά κενό αποτέλεσμα από χαμηλής ποιότητας filler.</span></div>}
      {limit<visible.length&&<div className="loadMoreWrap"><button className="loadMore" onClick={()=>setLimit(v=>v+12)}>Δείξε άλλες {Math.min(12,visible.length-limit)} λύσεις <span>↓</span></button><small>{limit} από {visible.length}</small></div>}
    </section>

    <section id="proof" className="shell trustManifest reveal">
      <div><p className="kicker">THE TRUST CONTRACT</p><h2>Δεν κρύβουμε τα κενά.</h2></div>
      <div className="manifestGrid">
        <article><span>✓</span><h3>Evidence</h3><p>Τιμές, official listing facts, seller identity και observed signals μένουν ξεχωριστά από AI inference.</p></article>
        <article><span>≈</span><h3>Weighted AI</h3><p>Seller quality, EU fulfillment, Greek scarcity, value και logistics αξιολογούνται ως evidence trade-offs — όχι ως τυφλά hard filters.</p></article>
        <article><span>≤3</span><h3>Όχι filler</h3><p>Commission ≥ €10 είναι το εμπορικό gate. Μετά κρατάμε μόνο διαφορετικές λύσεις που αντέχουν στο research· μπορεί να είναι 0, 1, 2 ή 3.</p></article>
      </div>
    </section>
  </main>;
}
