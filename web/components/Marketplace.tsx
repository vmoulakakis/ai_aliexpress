"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import type {Product} from "../lib/products";
import {compactTitle,money,n} from "../lib/products";

const stateLabel=(p:Product)=>{
  const o=(p.greek_gap_opportunity||"").toUpperCase();
  if(o==="PROMISING") return ["Ισχυρό market gap","good"];
  if(o==="TEST") return ["Χρειάζεται validation","warn"];
  return ["Περιορισμένο gap","muted"];
};

export default function Marketplace({products}:{products:Product[]}){
  const [q,setQ]=useState("");
  const [filter,setFilter]=useState("ALL");
  const [limit,setLimit]=useState(12);
  const problems=useMemo(()=>{
    const m=new Map<string,string>();
    products.forEach(p=>{if(p.problem_key&&p.problem_title)m.set(p.problem_key,p.problem_title)});
    return [...m.entries()].slice(0,16);
  },[products]);

  const visible=useMemo(()=>products.filter(p=>{
    const text=(p.title+" "+(p.problem_title||"")+" "+(p.target_customer||"")).toLowerCase();
    return (!q||text.includes(q.toLowerCase()))&&(filter==="ALL"||p.problem_key===filter);
  }),[products,q,filter]);

  return <main className="market">
    <section className="marketHero shell">
      <div className="marketHeroCopy reveal">
        <p className="kicker">87 LIVE PRODUCT INTELLIGENCE PROFILES · GREECE</p>
        <h1>Δεν ψάχνεις προϊόν.<br/><em>Ψάχνεις απόδειξη ότι αξίζει.</em></h1>
        <p className="heroBody">Marketplace που ξεκινά από το οικονομικό κόστος ενός πραγματικού προβλήματος και καταλήγει σε προϊόν μόνο όταν υπάρχει επαρκές evidence για να το εξετάσεις.</p>
        <div className="searchBar">
          <span>⌕</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Γράψε πρόβλημα, χρήση ή προϊόν…" aria-label="Αναζήτηση προϊόντων"/>
          <b>{visible.length}</b>
        </div>
      </div>
      <div className="marketOrbit reveal delay1">
        <div className="orbitCore"><span>PROOF</span><strong>87</strong><small>eligible products</small></div>
        <div className="orbitTag t1">Greek gap</div><div className="orbitTag t2">ROI</div><div className="orbitTag t3">Evidence</div><div className="orbitTag t4">Risk</div>
      </div>
    </section>

    <section className="proofStrip">
      <div><b>01</b><span>Πρόβλημα</span></div><i>→</i><div><b>02</b><span>Κόστος</span></div><i>→</i><div><b>03</b><span>Market gap</span></div><i>→</i><div><b>04</b><span>Product proof</span></div><i>→</i><div><b>05</b><span>Κέρδος / ROI</span></div><i>→</i><div><b>06</b><span>Απόφαση</span></div>
    </section>

    <section className="shell problemHub reveal">
      <div className="sectionTitle"><p className="kicker">START WITH THE PAIN</p><h2>Τι θέλεις να σταματήσεις να σου κοστίζει;</h2></div>
      <div className="chips">
        <button className={filter==="ALL"?"active":""} onClick={()=>{setFilter("ALL");setLimit(12)}}>Όλα</button>
        {problems.map(([k,t])=><button key={k} className={filter===k?"active":""} onClick={()=>{setFilter(k);setLimit(12)}}>{t}</button>)}
      </div>
    </section>

    <section className="shell productSection">
      <div className="sectionHead">
        <div><p className="kicker">PROOF-FIRST MARKETPLACE</p><h2>{visible.length} λύσεις για αξιολόγηση</h2></div>
        <p>Κάθε προϊόν ανοίγει σε δική του landing page με Product Proof Passport, οικονομικό calculator, evidence ledger και τα δεδομένα που θα μπορούσαν να αλλάξουν την πρόταση.</p>
      </div>
      <div className="productGrid">
        {visible.slice(0,limit).map((p,i)=>{
          const [lab,cls]=stateLabel(p);
          const conf=Math.round(n(p.intelligence_confidence)*100);
          return <Link href={"/product/"+p.source_product_id} className="productCard reveal" style={{animationDelay:`${Math.min(i,12)*35}ms`}} key={p.product_candidate_id}>
            <div className="imageStage">
              {p.image_url?<img src={p.image_url} alt={p.title} loading="lazy" decoding="async"/>:<div className="imageFallback">NO IMAGE</div>}
              <span className={"gapBadge "+cls}>{lab}</span>
              <span className="passportMini">PROOF PASSPORT ↗</span>
            </div>
            <div className="cardBody">
              <p className="painLabel">{p.problem_title||"Product intelligence"}</p>
              <h3>{compactTitle(p.title)}</h3>
              <div className="cardMeta"><strong>{money(p.price_eur)}</strong><span>{p.sold_count||0} observed sales</span></div>
              <div className="proofBars">
                <div><span>Pain fit</span><b style={{width:`${Math.max(28,Math.round(n(p.greek_gap_confidence)*100))}%`}}></b></div>
                <div><span>Evidence</span><b style={{width:`${Math.max(22,conf)}%`}}></b></div>
              </div>
              <div className="cardBottom"><span>{p.data_completeness}</span><b>Δες αν αξίζει για μένα →</b></div>
            </div>
          </Link>
        })}
      </div>
      {limit<visible.length&&<div className="loadMoreWrap"><button className="loadMore" onClick={()=>setLimit(v=>v+12)}>Δείξε άλλες {Math.min(12,visible.length-limit)} λύσεις <span>↓</span></button><small>{limit} από {visible.length}</small></div>}
    </section>

    <section className="shell trustManifest reveal">
      <div><p className="kicker">THE TRUST CONTRACT</p><h2>Δεν κρύβουμε τα κενά.</h2></div>
      <div className="manifestGrid">
        <article><span>✓</span><h3>Επιβεβαιωμένο</h3><p>Τιμή listing, seller/shop identity, observed sales, κύρια εικόνα, market-gap evidence.</p></article>
        <article><span>≈</span><h3>AI inference</h3><p>Αντιστοίχιση pain → product, commercial relevance και πιθανό conversion fit με explicit confidence.</p></article>
        <article><span>!</span><h3>Missing evidence</h3><p>Reviews, warranty, certifications, SKU matrix ή fulfillment που δεν έχουμε επιβεβαιώσει εμφανίζονται ως κενά — όχι ως facts.</p></article>
      </div>
    </section>
  </main>
}
