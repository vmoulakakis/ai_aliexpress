"use client";
import {useMemo,useState} from "react";
import type {Product} from "../lib/products";
import type {SiteDirection} from "../lib/siteDirector";
import {money,n} from "../lib/products";

export default function SignatureExperience({product,direction}:{product:Product;direction:SiteDirection}){
  const [scan,setScan]=useState(52);
  const [scenario,setScenario]=useState(Math.max(300,Math.round(n(product.price_eur)*4)));
  const [active,setActive]=useState(0);
  const price=n(product.price_eur);
  const benefit=scenario*.35;
  const months=benefit>0?price/benefit*12:0;

  const facts=useMemo(()=>[
    {label:"Pain",value:product.problem_title||"Specific use case"},
    {label:"Observed sales",value:String(product.sold_count||0)},
    {label:"Greek opportunity",value:product.greek_gap_opportunity||"Unknown"},
    {label:"Evidence",value:`${Math.round(n(product.intelligence_confidence||product.selection_confidence)*100)}%`}
  ],[product]);

  if(direction.archetype==="INVISIBLE_PROBLEM_SOLVER"){
    return <section className="signatureSection scanExperience">
      <div className="signatureCopy"><p className="kicker">SIGNATURE EXPERIENCE</p><h2>Κάνε το αόρατο <em>ορατό.</em></h2><p>Σύρε τη γραμμή για να δεις πώς ένα “κρυφό” πρόβλημα μετατρέπεται σε κάτι που μπορείς να εντοπίσεις και να ελέγξεις.</p></div>
      <div className="scanDemo" style={{["--scan" as any]:scan+"%"}}>
        <div className="scanNormal"><span>NORMAL VIEW</span></div>
        <div className="scanDetected"><span>DETECTED LAYER</span><div className="hotspot h1"/><div className="hotspot h2"/><div className="hotspot h3"/></div>
        <div className="scanDivider"/>
        <input aria-label="Problem reveal" type="range" min="8" max="92" value={scan} onChange={e=>setScan(+e.target.value)}/>
      </div>
      <div className="signatureFacts">{facts.map(f=><div key={f.label}><span>{f.label}</span><b>{f.value}</b></div>)}</div>
    </section>;
  }

  if(direction.archetype==="MONEY_SAVER"){
    return <section className="signatureSection moneyExperience">
      <div className="signatureCopy"><p className="kicker">LIVE VALUE MODEL</p><h2>Μην αγοράσεις gadget. <em>Αγόρασε απόσβεση.</em></h2><p>Δοκίμασε ένα απλό scenario ετήσιου κόστους. Δεν είναι υπόσχεση εξοικονόμησης — είναι το threshold που πρέπει να δικαιολογήσει η λύση.</p></div>
      <div className="moneyStage">
        <label>Ετήσιο κόστος προβλήματος <strong>{money(scenario)}</strong><input type="range" min="100" max="5000" step="50" value={scenario} onChange={e=>setScenario(+e.target.value)}/></label>
        <div className="paybackOrbit"><span>35% scenario benefit</span><strong>{months.toFixed(1)}</strong><small>MONTHS TO PAYBACK</small></div>
        <div className="moneyMetrics"><div><span>Product</span><b>{money(price)}</b></div><div><span>Scenario benefit</span><b>{money(benefit)}</b></div></div>
      </div>
    </section>;
  }

  if(direction.archetype==="PROFESSIONAL_EDGE"){
    const steps=["Use case","Capability","Workflow","Proof"];
    return <section className="signatureSection proExperience">
      <div className="signatureCopy"><p className="kicker">PRO TOOL EXPLORER</p><h2>Δεν αγοράζεις specs. <em>Αγοράζεις capability.</em></h2><p>Δες το εργαλείο σαν μέρος της δουλειάς σου: πού μπαίνει, τι αλλάζει και ποιο evidence πρέπει να ελέγξεις.</p></div>
      <div className="proStage">
        <div className="proObject">{product.image_url?<img src={product.image_url} alt={product.title}/>:<div>PRODUCT</div>}<span className="anno a1">INPUT</span><span className="anno a2">MEASURE</span><span className="anno a3">DECIDE</span></div>
        <div className="proTabs">{steps.map((s,i)=><button className={active===i?"active":""} onClick={()=>setActive(i)} key={s}><span>0{i+1}</span>{s}</button>)}</div>
        <div className="proNarrative">{[
          product.problem_title||"Specific professional pain",
          direction.cardHook,
          "Μειώνει αβεβαιότητα ή χρόνο διάγνωσης μόνο αν ταιριάζει στη ροή εργασίας σου.",
          `${product.fact_count||0} verified listing facts · ${product.review_count||0} verified reviews`
        ][active]}</div>
      </div>
    </section>;
  }

  if(direction.archetype==="REMOTE_CONTROL"){
    return <section className="signatureSection remoteExperience">
      <div className="signatureCopy"><p className="kicker">REMOTE CONTROL SIMULATION</p><h2>Το προϊόν είναι εκεί. <em>Εσύ όχι.</em></h2><p>Η αξία είναι η πληροφορία που φτάνει σε σένα την κατάλληλη στιγμή.</p></div>
      <div className="remoteStage"><div className="remoteNode source">PROPERTY<small>sensor online</small></div><div className="signalLine"><i/><i/><i/></div><div className="remoteNode target">YOU<small>alert received</small></div></div>
    </section>;
  }

  return <section className="signatureSection theatreExperience">
    <div className="signatureCopy"><p className="kicker">PRODUCT THEATRE</p><h2>Πρώτα η αλλαγή. <em>Μετά το προϊόν.</em></h2><p>{direction.cardHook}</p></div>
    <div className="theatreStage">{product.image_url?<img src={product.image_url} alt={product.title}/>:null}<div className="theatreRing r1"/><div className="theatreRing r2"/><span>{product.problem_title||"DISCOVERY"}</span></div>
  </section>;
}
