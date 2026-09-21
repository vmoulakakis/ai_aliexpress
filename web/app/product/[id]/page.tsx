import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import ProductDecision from "../../../components/ProductDecision";
import SignatureExperience from "../../../components/SignatureExperience";
import {getProduct,money,n} from "../../../lib/products";
import {directProduct,affiliateHref} from "../../../lib/siteDirector";

export const revalidate=300;

function clean(arr:any[]|null|undefined,key:string){
  return (arr||[]).filter(Boolean).map(x=>typeof x==="string"?x:(x?.[key]||x?.factor||x?.risk||x?.pro||x?.con||null)).filter(Boolean).slice(0,5);
}

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params; const p=await getProduct(id); if(!p) return {};
  return {
    title:(p.title_options?.[0]||`${p.title} — FOUND.`).slice(0,120),
    description:(p.meta_description_options?.[0]||`Δες τι λύνει το ${p.title}, τι evidence έχουμε και την τρέχουσα προσφορά για την ελληνική αγορά.`).slice(0,180),
    alternates:{canonical:`/product/${id}`}
  };
}

export default async function ProductPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const p=await getProduct(id); if(!p) notFound();
  const gap=p.greek_fit_analysis||{};
  const seller=p.seller_quality||{};
  const pros=clean(p.pros,"pro"), cons=clean(p.cons,"con"), risks=clean(p.dealbreakers,"risk");
  const gaps=(p.evidence_gaps||[]).filter(Boolean);
  const conf=Math.round(n(p.intelligence_confidence||p.selection_confidence)*100);
  const marketNarrative=gap.gap_thesis||(p.greek_gap_opportunity
    ? `Market assessment: ${p.greek_gap_opportunity} · confidence ${Math.round(n(p.greek_gap_confidence)*100)}%. Το πλήρες Product×Pain narrative δεν έχει ακόμη αναγεννηθεί για αυτή τη χρήση.`
    : "Δεν υπάρχει ακόμη αρκετό pain-specific market evidence για ισχυρό claim.");
  const whyBuy=pros.length?pros:[
    p.problem_title?`Συνδέεται με το συγκεκριμένο pain: ${p.problem_title}.`:"Υπάρχει συγκεκριμένο use-case mapping.",
    p.sold_count&&p.sold_count>0?`${p.sold_count} observed sales στο τρέχον evidence snapshot.`:"Το sales evidence δεν έχει ακόμη επιβεβαιωθεί."
  ];
  const whyNot=[...cons,...risks].length?[...cons,...risks].slice(0,6):[
    "Δεν έχει ακόμη αναγεννηθεί πλήρες pain-specific intelligence corpus.",
    "Specs, reviews, warranty και fulfillment πρέπει να ελεγχθούν πριν την τελική αγορά."
  ];
  const direction=directProduct(p);
  const affiliate=affiliateHref(p);
  const proof=[
    ["Pain relevance",p.problem_title?"Strong":"Partial","Το προϊόν έχει συνδεθεί με συγκεκριμένο pain cluster."],
    ["Greek market gap",p.greek_gap_opportunity==="PROMISING"?"Strong":"Partial",`${p.greek_gap_opportunity||"Unknown"} · confidence ${Math.round(n(p.greek_gap_confidence)*100)}%`],
    ["Listing facts",p.fact_count>=8?"Strong":"Partial",`${p.fact_count||0} verified atomic listing facts`],
    ["Seller evidence",p.sold_count&&p.sold_count>0?"Partial":"Missing",`${p.sold_count||0} observed sales · seller ${p.seller_source_id||"unknown"}`],
    ["Review evidence",p.review_count>0?"Strong":"Missing",p.review_count>0?`${p.review_count} verified reviews`:"Δεν υπάρχει verified written review corpus."],
    ["Specifications",p.spec_count>0?"Strong":"Missing",p.spec_count>0?`${p.spec_count} specs`:"Full specification matrix δεν έχει επιβεβαιωθεί."],
    ["Fulfillment",p.fulfillment_analysis?.status==="complete"?"Strong":"Partial",p.fulfillment_analysis?.status||"incomplete"],
    ["Data freshness","Strong","Live marketplace snapshot / periodic refresh"]
  ];

  return <main className={`productPage ${direction.theme}`}>
    <header className="topNav">
      <Link className="logo" href="/">FOUND.<small>DISCOVERY COMMERCE</small></Link>
      <Link className="backLink" href="/">← Marketplace</Link>
      <a className="navButton" href={affiliate} target="_blank" rel="nofollow sponsored noopener">{direction.primaryCta}</a>
    </header>

    <section className="productHero shell">
      <div className="productVisual reveal">
        <div className="imageHalo"></div>
        {p.image_url?<img src={p.image_url} alt={p.title}/>:null}
        <div className="floatingProof f1">Greek gap <b>{p.greek_gap_opportunity}</b></div>
        <div className="floatingProof f2">Evidence <b>{conf}%</b></div>
      </div>
      <div className="productLead reveal delay1">
        <p className="kicker">{p.problem_title}</p>
        <h1>{direction.heroHook}</h1>
        <p className="directorSub">{direction.heroSubhead}</p>
        <h2 className="productName">{p.title}</h2>
        <p className="audience">Για: <b>{p.target_customer||"στοχευμένη χρήση"}</b></p>
        <div className="priceLine"><strong>{money(p.price_eur)}</strong><span>{p.sold_count||0} observed sales</span></div>
        <div className="thesis"><span>WHY IT MAY MATTER</span><p>{marketNarrative}</p></div>
        <div className="heroCtas"><a className="buyButton" href={affiliate} target="_blank" rel="nofollow sponsored noopener">{direction.primaryCta}</a><a href="#roi" className="ghostButton">Υπολόγισε ROI</a></div>
        <p className="affiliateNote">Affiliate link · η προμήθεια δεν αλλάζει την τιμή για εσένα και δεν αγοράζει κατάταξη.</p>
      </div>
    </section>

    <div className="shell"><SignatureExperience product={p} direction={direction}/></div>

    <section className="shell funnelRail" aria-label="Buying journey">
      <div className="funnelMeta"><span>{direction.archetype.replaceAll("_"," ")}</span><b>{direction.trigger.replaceAll("_"," ")}</b></div>
      <ol>{direction.funnel.map((stage,i)=><li key={stage}><span>{String(i+1).padStart(2,"0")}</span>{stage}</li>)}</ol>
    </section>

    <section className="shell decisionBand">
      <div><span>AI intelligence confidence</span><strong>{conf}%</strong></div>
      <div><span>Greek opportunity</span><strong>{p.greek_gap_opportunity||"—"}</strong></div>
      <div><span>Data completeness</span><strong>{p.data_completeness}</strong></div>
      <div><span>Verified facts</span><strong>{p.fact_count}</strong></div>
    </section>

    <section className="shell storyGrid">
      <article className="storyBlock"><p className="kicker">THE PAIN</p><h2>Γιατί υπάρχει αυτή η αγορά;</h2><p>{p.pain_feature_map?.[0]?.pain_description||p.problem_title}</p><blockquote>{p.problem_title}</blockquote></article>
      <article className="storyBlock dark"><p className="kicker">THE GREEK GAP</p><h2>Τι βλέπουμε στην Ελλάδα;</h2><p>{marketNarrative}</p><dl><div><dt>Supply</dt><dd>{gap.supply_state||"UNKNOWN"}</dd></div><div><dt>Competition</dt><dd>{gap.competition_state||"UNKNOWN"}</dd></div><div><dt>Buyer intent</dt><dd>{gap.buyer_intent_state||"UNKNOWN"}</dd></div></dl></article>
    </section>

    <section className="shell passportFull">
      <div className="passportTitle"><p className="kicker">PRODUCT PROOF PASSPORT</p><h2>Τι είναι ισχυρό, τι μερικό, τι λείπει.</h2><p>Το trust δεν προκύπτει από stars. Προκύπτει από το να βλέπεις την ποιότητα κάθε κομματιού evidence.</p></div>
      <div className="passportRows">{proof.map(([label,state,note])=><div className="passportRow" key={String(label)}><span>{label}</span><b className={String(state).toLowerCase()}>{state}</b><p>{note}</p></div>)}</div>
    </section>

    <div id="roi" className="shell"><ProductDecision product={p}/></div>

    <section className="shell evidenceNarrative">
      <article className="goodPanel"><p className="kicker">WHY BUY</p><h2>Τι συνηγορεί υπέρ</h2><ul>{whyBuy.map(x=><li key={x}>{x}</li>)}</ul></article>
      <article className="riskPanel"><p className="kicker">WHY NOT</p><h2>Τι μπορεί να ακυρώσει την αγορά</h2><ul>{whyNot.map(x=><li key={x}>{x}</li>)}</ul></article>
    </section>

    <section className="shell changeMind">
      <div><p className="kicker">COUNTER-EVIDENCE</p><h2>Τι θα άλλαζε τη γνώμη μας;</h2></div>
      <ol>
        <li><span>01</span>Ίδια verified λειτουργία με χαμηλότερο landed cost στην Ελλάδα.</li>
        <li><span>02</span>Το δικό σου annual pain cost δεν δικαιολογεί την τιμή.</li>
        <li><span>03</span>Warranty, certification ή service αποδειχθούν κρίσιμα και ανεπαρκή.</li>
        <li><span>04</span>Το πραγματικό spec fit δεν επιβεβαιώνει τη χρήση που χρειάζεσαι.</li>
      </ol>
    </section>

    <section className="shell knowLedger">
      <div className="verified"><p className="kicker">VERIFIED</p><h2>Τι ξέρουμε</h2><p>Τιμή listing · product identity · seller ID · observed sales · main image · Greek pain-gap assessment · {p.fact_count} atomic facts.</p></div>
      <div className="unknown"><p className="kicker">MISSING EVIDENCE</p><h2>Τι δεν ξέρουμε ακόμα</h2><ul>{gaps.slice(0,6).map((x:any)=><li key={String(x)}>{String(x).replaceAll("_"," ")}</li>)}</ul></div>
    </section>

    <section className="finalProductCta">
      <div><p>Αν το οικονομικό σου threshold βγαίνει και τα missing evidence δεν είναι κρίσιμα:</p><h2>τότε έχει νόημα να εξετάσεις το listing.</h2></div>
      <a href={affiliate} target="_blank" rel="nofollow sponsored noopener">{direction.primaryCta}</a>
    </section>
  </main>
}
