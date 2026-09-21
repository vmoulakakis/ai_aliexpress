"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import type {Product,CategoryAllocation,SubcategoryAllocation} from "../lib/products";
import {compactTitle,money,n} from "../lib/products";
import {directProduct} from "../lib/siteDirector";

const stateLabel=(p:Product)=>{
  if(p.publication_tier==="VERIFIED_PAIN_WINNER") return ["VERIFIED","good"];
  const o=(p.greek_gap_opportunity||"").toUpperCase();
  if(o==="PROMISING") return ["RESEARCHED","good"];
  if(o==="TEST") return ["DISCOVERY","warn"];
  return ["DISCOVERY","muted"];
};
const roleLabel=(v:any)=>String(v||"category_solution").replaceAll("_"," ").toUpperCase();

export default function Marketplace({products,categories,subcategories,mode}:{products:Product[];categories:CategoryAllocation[];subcategories:SubcategoryAllocation[];mode:string}){
  const [q,setQ]=useState("");
  const [category,setCategory]=useState("ALL");
  const [problem,setProblem]=useState("ALL");
  const [limit,setLimit]=useState(18);

  const uniqueProducts=useMemo(()=>{
    const seen=new Set<string>();
    return products.filter(p=>{
      const k=(p.publication_tier==="AI_CATEGORY_TOP10"?(p.problem_category||"")+"|":"")+(p.product_candidate_id||"")+"|"+(p.offer_id||"");
      if(seen.has(k)) return false; seen.add(k); return true;
    });
  },[products]);

  const verified=useMemo(()=>uniqueProducts.filter(p=>p.publication_tier==="VERIFIED_PAIN_WINNER"),[uniqueProducts]);
  const heroProduct=verified[0]||uniqueProducts[0];
  const featured=useMemo(()=>{
    const seen=new Set<string>();
    return [...verified].sort((a,b)=>n(b.demand_allocation_score)-n(a.demand_allocation_score)).filter(p=>{
      const key=p.problem_key||p.problem_cluster_id||p.problem_category||p.product_candidate_id;
      if(seen.has(String(key))) return false; seen.add(String(key)); return true;
    }).slice(0,4);
  },[verified]);
  const discoveryDrops=useMemo(()=>{
    const groups=[
      {id:"SAVE_MONEY",title:"Save money",sub:"Λύσεις που μπορούν να κάνουν το κόστος μετρήσιμο."},
      {id:"AVOID_DAMAGE",title:"Avoid damage",sub:"Βρες το πρόβλημα πριν γίνει ακριβή ζημιά."},
      {id:"PROFESSIONAL_ADVANTAGE",title:"Professional edge",sub:"Εργαλεία που δίνουν specialist capability."}
    ];
    return groups.map(g=>({...g,items:verified.filter(p=>directProduct(p).trigger===g.id).slice(0,4)})).filter(g=>g.items.length);
  },[uniqueProducts,verified]);

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

  const chooseCategory=(c:string)=>{setCategory(c);setProblem("ALL");setLimit(18)};
  const verifiedCount=verified.length;
  const fallbackCount=uniqueProducts.length-verifiedCount;
  const heroDirection=heroProduct?directProduct(heroProduct):null;

  return <main className="market discoveryMarket">
    <section className="discoveryHero shell">
      <div className="discoveryCopy reveal">
        <p className="kicker">CURATED BY AI · BUILT AROUND REAL PROBLEMS</p>
        <h1>Πράγματα που δεν ήξερες ότι <em>χρειάζεσαι.</em></h1>
        <p className="heroBody">Μέχρι να δεις τι λύνουν. Ανακαλύπτουμε προϊόντα με πραγματικό use-case, ελληνικό ενδιαφέρον και εμπορικό νόημα — και μετά σου δείχνουμε το γιατί.</p>
        <div className="searchBar cinematicSearch"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Πες το πρόβλημα, όχι το όνομα του προϊόντος…" aria-label="Αναζήτηση marketplace"/><b>{visible.length}</b></div>
        <div className="heroSignals"><span>{verifiedCount} verified</span><span>{fallbackCount} discoveries</span><span>{demandCategories.length} live categories</span></div>
      </div>

      {heroProduct&&heroDirection&&<Link href={"/product/"+heroProduct.source_product_id} className="heroProductStage reveal delay1">
        <div className="heroProductMeta"><span>FEATURED DISCOVERY</span><b>{heroDirection.trigger.replaceAll("_"," ")}</b></div>
        <div className="heroProductImage">{heroProduct.image_url?<img src={heroProduct.image_url} alt={heroProduct.title}/>:null}<div className="scanBeam"/></div>
        <div className="heroProductCopy"><p>{heroDirection.cardHook}</p><h2>{compactTitle(heroProduct.title,92)}</h2><div><strong>{money(heroProduct.price_eur)}</strong><span>Open story →</span></div></div>
      </Link>}
    </section>

    <section className="manifestTicker" aria-label="How the marketplace works">
      <span>DISCOVER</span><i>→</i><span>UNDERSTAND THE PAIN</span><i>→</i><span>SEE THE TRANSFORMATION</span><i>→</i><span>CHECK THE PROOF</span><i>→</i><span>DECIDE</span>
    </section>

    {!!featured.length&&<section className="shell editorialDrops">
      <div className="sectionHead">
        <div><p className="kicker">THIS WEEK'S DISCOVERIES</p><h2>Λύσεις που αξίζουν δεύτερη ματιά.</h2></div>
        <p>Όχι επειδή είναι “viral”. Επειδή συνδυάζουν pain fit, ζήτηση, evidence και ξεκάθαρο λόγο ύπαρξης.</p>
      </div>
      <div className="featureMosaic">
        {featured.map((p,i)=>{
          const d=directProduct(p);
          return <Link className={"featureTile tile"+i} href={"/product/"+p.source_product_id} key={p.product_candidate_id+"f"}>
            <div className="featureIndex">0{i+1}</div>
            <div className="featureVisual">{p.image_url?<img src={p.image_url} alt={p.title} loading="lazy"/>:null}</div>
            <div className="featureCopy"><span>{d.trigger.replaceAll("_"," ")}</span><h3>{d.cardHook}</h3><p>{compactTitle(p.title,74)}</p><b>{money(p.price_eur)} · Explore →</b></div>
          </Link>
        })}
      </div>
    </section>}

    <section id="demand" className="demandAtlas">
      <div className="shell sectionHead">
        <div><p className="kicker">LIVE DEMAND ATLAS</p><h2>Αγορές με πραγματικά προβλήματα.</h2></div>
        <p>Κάθε category ανοίγει διαφορετικό discovery field. Δεν πουλάμε taxonomy· οργανώνουμε λύσεις γύρω από pains.</p>
      </div>
      <div className="atlasRail">
        {demandCategories.map(c=>{
          const active=category===c.category;
          return <button key={c.category} className={"atlasCard "+(active?"active":"")} onClick={()=>chooseCategory(active?"ALL":c.category)}>
            <span>{c.category}</span><strong>{Math.round(n(c.avg_demand_score))}</strong><small>DEMAND SIGNAL</small>
            <p>{Math.min(10,productCounts.get(c.category)||0)}/10 solutions · {c.active_pains} pains</p>
          </button>
        })}
      </div>
      <div className="shell subDemand">
        {categorySubs.map(s=><div key={s.category+"-"+s.subcategory}><span>{s.category} / {s.subcategory}</span><b>{Math.round(n(s.avg_demand_score))}</b><small>{s.active_pains} active pain{s.active_pains===1?"":"s"}</small></div>)}
      </div>
    </section>

    {discoveryDrops.map((drop,gi)=><section className={"shell commerceDrop drop"+gi} key={drop.id}>
      <div className="dropTitle"><span>0{gi+1}</span><div><p className="kicker">{drop.id.replaceAll("_"," ")}</p><h2>{drop.title}</h2><p>{drop.sub}</p></div></div>
      <div className="dropRail">{drop.items.map(p=>{
        const d=directProduct(p);
        const [lab,cls]=stateLabel(p);
        return <Link className="dropCard" href={"/product/"+p.source_product_id} key={p.product_candidate_id+drop.id}>
          <div className="dropImage">{p.image_url?<img src={p.image_url} alt={p.title} loading="lazy"/>:null}<span className={"gapBadge "+cls}>{lab}</span></div>
          <div><p>{p.problem_title||d.cardHook}</p><h3>{compactTitle(p.title,64)}</h3><footer><b>{money(p.price_eur)}</b><span>See why →</span></footer></div>
        </Link>
      })}</div>
    </section>)}

    <section className="shell problemHub reveal">
      <div className="sectionTitle"><p className="kicker">START WITH THE PAIN</p><h2>Διάλεξε το πρόβλημα — όχι το προϊόν.</h2></div>
      <div className="chips">
        <button className={problem==="ALL"?"active":""} onClick={()=>{setProblem("ALL");setLimit(18)}}>Όλα τα pains</button>
        {problems.map(([k,t])=><button key={k} className={problem===k?"active":""} onClick={()=>{setProblem(k);setLimit(18)}}>{t}</button>)}
      </div>
    </section>

    <section id="market" className="shell productSection">
      <div className="sectionHead">
        <div><p className="kicker">DISCOVERY MARKET</p><h2>{visible.length} λύσεις για εξερεύνηση</h2></div>
        <p>{problem==="ALL"?"Curated category shelves και verified pain winners σε ένα visual discovery field.":"Για κάθε συγκεκριμένο pain κρατάμε έως 3 verified winners και συμπληρώνουμε με researched category discoveries όπου χρειάζεται."}</p>
      </div>
      <div className="productGrid artisticGrid">
        {visible.slice(0,limit).map((p,i)=>{
          const [lab,cls]=stateLabel(p);
          const conf=Math.round(n(p.intelligence_confidence||p.selection_confidence)*100);
          const demand=Math.round(n(p.demand_allocation_score));
          const direction=directProduct(p);
          return <Link href={"/product/"+p.source_product_id} className={"productCard reveal cardTheme-"+direction.theme} style={{animationDelay:`${Math.min(i,12)*35}ms`}} key={(p.product_candidate_id||"")+"|"+(p.offer_id||"")}>
            <div className="imageStage">
              {p.image_url?<img src={p.image_url} alt={p.title} loading="lazy" decoding="async"/>:<div className="imageFallback">NO IMAGE</div>}
              <span className={"gapBadge "+cls}>{lab}</span><span className="passportMini">{direction.trigger.replaceAll("_"," ")} ↗</span>
            </div>
            <div className="cardBody">
              <p className="categoryLine">{p.problem_category||"Opportunity"}{p.problem_subcategory?" / "+p.problem_subcategory:""} · demand {demand||"—"}</p>
              <p className="painLabel">{direction.cardHook}</p><h3>{compactTitle(p.title)}</h3>
              <div className="cardMeta"><strong>{money(p.price_eur)}</strong><span>{(p.sold_count||0)>0?`${p.sold_count} observed sales`:"AI evidence review"}</span></div>
              <div className="proofBars"><div><span>Demand</span><b style={{width:`${Math.max(12,demand)}%`}}></b></div><div><span>Evidence</span><b style={{width:`${Math.max(18,conf)}%`}}></b></div></div>
              <div className="cardBottom"><span>#{p.selection_rank||"?"} · {roleLabel(p.selection_role)}</span><b>Open story →</b></div>
            </div>
          </Link>
        })}
      </div>
      {!visible.length&&<div className="emptyState"><b>Η category βρίσκεται σε ενεργό AI research expansion.</b><span>Οι agents συνεχίζουν discovery μέχρι να υπάρχει ουσιαστικό set λύσεων.</span></div>}
      {limit<visible.length&&<div className="loadMoreWrap"><button className="loadMore" onClick={()=>setLimit(v=>v+18)}>Δείξε άλλες {Math.min(18,visible.length-limit)} λύσεις <span>↓</span></button><small>{limit} από {visible.length}</small></div>}
    </section>

    <section id="proof" className="trustStage">
      <div className="shell trustManifest reveal">
        <div><p className="kicker">DESIRE, THEN PROOF</p><h2>Πρώτα καταλαβαίνεις γιατί το θέλεις. Μετά αν αξίζει να το αγοράσεις.</h2></div>
        <div className="manifestGrid">
          <article><span>01</span><h3>Problem first</h3><p>Κάθε προϊόν συνδέεται με συγκεκριμένο pain και buyer context.</p></article>
          <article><span>02</span><h3>Adaptive funnel</h3><p>Άλλο funnel για energy saver, άλλο για diagnostic tool, άλλο για novelty discovery.</p></article>
          <article><span>03</span><h3>Affiliate transparency</h3><p>Η αγορά γίνεται από το πραγματικό promotion link. Η προμήθεια δεν καθορίζει ranking.</p></article>
        </div>
      </div>
    </section>
  </main>;
}
