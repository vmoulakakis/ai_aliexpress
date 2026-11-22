"use client";
import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import type {Product} from "../lib/products";
import {compactTitle,money} from "../lib/products";
import "./EuropeHome.css";

const countries=[
 {code:"GR",label:"Ελλάδα",flag:"🇬🇷",lang:"el",cities:["Athens","Thessaloniki","Patras"]},
 {code:"CY",label:"Κύπρος",flag:"🇨🇾",lang:"el",cities:["Nicosia","Limassol","Larnaca"]},
 {code:"DE",label:"Deutschland",flag:"🇩🇪",lang:"de",cities:["Berlin","Munich","Hamburg"]},
 {code:"FR",label:"France",flag:"🇫🇷",lang:"fr",cities:["Paris","Lyon","Marseille"]},
 {code:"IT",label:"Italia",flag:"🇮🇹",lang:"it",cities:["Rome","Milan","Turin"]},
 {code:"ES",label:"España",flag:"🇪🇸",lang:"es",cities:["Madrid","Barcelona","Valencia"]},
 {code:"NL",label:"Nederland",flag:"🇳🇱",lang:"en",cities:["Amsterdam","Rotterdam","Utrecht"]},
 {code:"PL",label:"Polska",flag:"🇵🇱",lang:"en",cities:["Warsaw","Krakow","Wroclaw"]}
] as const;
const copy={
 el:{nav:["Η ιδέα","Ανακαλύψεις","Αξιοπιστία"],hero:"Η λύση που ψάχνεις ίσως υπάρχει ήδη.",highlight:"Απλώς δεν την έχεις ανακαλύψει.",sub:"Πες στον AXI τι χρειάζεσαι. Θα εξετάσει λύσεις, θα αναζητήσει στοιχεία για τη χώρα σου και θα ξεχωρίσει όσα γνωρίζουμε από όσα χρειάζονται επιβεβαίωση.",ask:"Τι θα ήθελες να λύσεις σήμερα;",placeholder:"Π.χ. θέλω κάτι για να προστατεύσω τα φυτά μου στο μπαλκόνι...",cta:"Ξεκίνα με τον AXI",location:"Η αγορά σου",city:"Πόλη",lanes:"Τρεις τρόποι να ανακαλύψεις κάτι καλύτερο.",discover:"Ανακάλυψε προϊόντα",proof:"Η εμπιστοσύνη δεν είναι ένα διαφημιστικό badge.",install:"Εγκατάσταση στο κινητό",catalogue:"Επιλεγμένες λύσεις προς διερεύνηση",see:"Δες τη λύση"},
 en:{nav:["The idea","Discoveries","Our standard"],hero:"The solution you're looking for may already exist.",highlight:"You just haven't found it yet.",sub:"Tell AXI what you need. It will examine solutions, investigate evidence for your country, and distinguish verified facts from open questions.",ask:"What would you like to solve today?",placeholder:"E.g. I need a smart solution for my balcony plants...",cta:"Explore with AXI",location:"Your market",city:"City",lanes:"Three ways to discover better.",discover:"Explore products",proof:"Trust is not a marketing badge.",install:"Install on mobile",catalogue:"Solutions worth investigating",see:"Explore solution"},
 de:{nav:["Unsere Idee","Entdecken","Transparenz"],hero:"Die gesuchte Lösung gibt es vielleicht schon.",highlight:"Du hast sie nur noch nicht entdeckt.",sub:"Beschreibe AXI dein Problem. Wir prüfen mögliche Lösungen und was für dein Land tatsächlich belegt ist.",ask:"Was möchtest du heute lösen?",placeholder:"Zum Beispiel eine Lösung für meine Balkonpflanzen ...",cta:"Mit AXI entdecken",location:"Dein Markt",city:"Stadt",lanes:"Drei Wege zu besseren Entdeckungen.",discover:"Produkte entdecken",proof:"Vertrauen erfordert Nachweise.",install:"App installieren",catalogue:"Lösungen zur Prüfung",see:"Lösung ansehen"},
 fr:{nav:["Le concept","Découvertes","Fiabilité"],hero:"La solution que vous cherchez existe peut-être déjà.",highlight:"Il reste à la découvrir.",sub:"Expliquez votre besoin à AXI. Il examinera les solutions et les preuves disponibles pour votre pays.",ask:"Quel problème souhaitez-vous résoudre ?",placeholder:"Par exemple, une solution pour mes plantes sur le balcon ...",cta:"Découvrir avec AXI",location:"Votre marché",city:"Ville",lanes:"Trois façons de découvrir mieux.",discover:"Voir les produits",proof:"La confiance exige des preuves.",install:"Installer sur mobile",catalogue:"Solutions à explorer",see:"Découvrir"},
 it:{nav:["Il progetto","Scoperte","Affidabilità"],hero:"La soluzione che cerchi potrebbe già esistere.",highlight:"Devi solo scoprirla.",sub:"Racconta ad AXI il tuo problema. Esaminerà le possibili soluzioni e le prove disponibili per il tuo paese.",ask:"Cosa vuoi risolvere oggi?",placeholder:"Ad esempio una soluzione per le piante sul balcone...",cta:"Scopri con AXI",location:"Il tuo mercato",city:"Città",lanes:"Tre modi per scoprire di più.",discover:"Scopri i prodotti",proof:"La fiducia richiede prove.",install:"Installa sul telefono",catalogue:"Soluzioni da valutare",see:"Scopri"},
 es:{nav:["La idea","Descubrimientos","Confianza"],hero:"La solución que buscas quizá ya exista.",highlight:"Solo falta descubrirla.",sub:"Cuéntale a AXI qué necesitas. Examinará soluciones y verificará la evidencia disponible para tu país.",ask:"¿Qué quieres resolver hoy?",placeholder:"Por ejemplo una solución para mis plantas del balcón...",cta:"Descubre con AXI",location:"Tu mercado",city:"Ciudad",lanes:"Tres formas de descubrir mejor.",discover:"Ver productos",proof:"La confianza exige pruebas.",install:"Instalar en móvil",catalogue:"Soluciones para investigar",see:"Explorar"}
};
const inspirations=[
 {icon:"↗",el:"Δεν μπορώ να το βρω στην Ελλάδα ή στην Ευρώπη",en:"I can't find it in local stores"},
 {icon:"✳",el:"Θέλω μια λύση για πρόβλημα στο σπίτι",en:"Solve an everyday problem"},
 {icon:"⌘",el:"Δείξε μου νέες και ασυνήθιστες τεχνολογίες",en:"Show me emerging technology"},
 {icon:"◇",el:"Ψάχνω ένα εξειδικευμένο επαγγελματικό εργαλείο",en:"Find a specialist tool"}
];
export default function EuropeHome({products}:{products:Product[]}){
 const [country,setCountry]=useState("GR");const [city,setCity]=useState("Athens");const [problem,setProblem]=useState("");
 const [deferred,setDeferred]=useState<any>(null);const [ios,setIos]=useState(false);const [installed,setInstalled]=useState(false);
 const selected=countries.find(x=>x.code===country)||countries[0];const c=copy[selected.lang]||copy.en;
 useEffect(()=>{
  const stored=sessionStorage.getItem("found-market");
  if(stored&&countries.some(x=>x.code===stored)){setCountry(stored);setCity(countries.find(x=>x.code===stored)!.cities[0]);}
  const handler=(event:Event)=>{event.preventDefault();setDeferred(event);};
  const onInstalled=()=>{setInstalled(true);setDeferred(null);};
  window.addEventListener("beforeinstallprompt",handler);window.addEventListener("appinstalled",onInstalled);
  setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  return()=>{window.removeEventListener("beforeinstallprompt",handler);window.removeEventListener("appinstalled",onInstalled)};
 },[]);
 function changeCountry(next:string){const record=countries.find(x=>x.code===next);if(!record)return;setCountry(next);setCity(record.cities[0]);sessionStorage.setItem("found-market",next)}
 function go(q:string){const params=new URLSearchParams({country,city,problem:q});window.location.assign("/discover?"+params.toString());}
 function send(e:FormEvent){e.preventDefault();if(problem.trim())go(problem.trim());}
 async function install(){if(!deferred)return;const event=deferred;setDeferred(null);await event.prompt();await event.userChoice;}
 const showcase=products.filter(x=>x.source_product_id&&x.title).slice(0,6);
 return <main className="fe"><div className="fe-glow" aria-hidden="true"/>
  <header className="fe-nav">
   <Link href="/" className="fe-logo">F<span>O</span>UND<span className="fe-dot">.</span></Link>
   <nav aria-label="Main"><a href="#how">{c.nav[0]}</a><a href="#worlds">{c.nav[1]}</a><a href="#trust">{c.nav[2]}</a></nav>
   <Link className="fe-nav-cta" href="/discover">AXI <span aria-hidden>↗</span></Link>
  </header>
  <section className="fe-hero" id="top"><div className="fe-hero-copy">
   <p className="fe-eyebrow"><span className="fe-signal"/> EUROPEAN AI DISCOVERY · PERSONALIZED FOR YOUR MARKET</p>
   <h1>{c.hero}<em>{c.highlight}</em></h1>
   <p className="fe-lead">{c.sub}</p>
   <div className="fe-chips">{inspirations.map((item,i)=><button key={i} onClick={()=>{setProblem(selected.lang==="el"?item.el:item.en);go(selected.lang==="el"?item.el:item.en);}}> <span>{item.icon}</span>{selected.lang==="el"?item.el:item.en}</button>)}</div>
  </div>
  <aside className="fe-hero-art" aria-hidden="true">
   <div className="fe-visual-halo"/><div className="fe-visual-ring ring-1"/><div className="fe-visual-ring ring-2"/><div className="fe-visual-core"><span>AXI</span><strong>✳</strong></div>
   <div className="fe-float f-a"><i/> LOCAL MARKET INTELLIGENCE</div><div className="fe-float f-b">✦ PRODUCT DISCOVERY</div><div className="fe-float f-c">↗ EUROPE / 27</div>
  </aside>
  <div className="fe-funnel">
   <div className="fe-funnel-title"><span className="fe-funnel-avatar">✳</span><div><strong>{c.ask}</strong><small>AXI / YOUR DISCOVERY AGENT</small></div></div>
   <div className="fe-local"><label>{c.location}<select value={country} onChange={e=>changeCountry(e.target.value)}>{countries.map(x=><option key={x.code} value={x.code}>{x.flag} {x.label}</option>)}</select></label><label>{c.city}<input value={city} maxLength={80} list="fe-cities" onChange={e=>setCity(e.target.value)} aria-label={c.city}/><datalist id="fe-cities">{selected.cities.map(x=><option key={x} value={x}/>)}</datalist></label></div>
   <form onSubmit={send} className="fe-question"><label htmlFor="fe-prompt" className="fe-sr">{c.ask}</label><input required id="fe-prompt" value={problem} onChange={e=>setProblem(e.target.value)} placeholder={c.placeholder} maxLength={700}/><button type="submit">{c.cta} ↗</button></form>
   <div className="fe-funnel-foot"><span>01 / PROBLEM</span><span>02 / LOCAL RESEARCH</span><span>03 / MATCH & EVIDENCE</span></div>
  </div></section>
  <div className="fe-ticker" aria-hidden="true"><span>DISCOVER WHAT'S MISSING</span><b>✳</b><span>UNDERSTAND THE PAIN</span><b>✳</b><span>VERIFY THE FACTS</span><b>✳</b><span>FIND BETTER</span></div>
  <section className="fe-section" id="how"><div className="fe-section-heading"><p>01 — DISCOVERY SYSTEM</p><h2>{c.lanes}</h2></div>
   <div className="fe-worlds" id="worlds">
    <Link href="/discover?lane=premium" className="fe-world premium"><span>01 / RESEARCH-GATED</span><strong>Premium<br/><em>Exclusive.</em></strong><p>High-value opportunities. Only verified claims earn a premium label.</p><b>Explore ↗</b></Link>
    <Link href="/discover?lane=pain" className="fe-world pain"><span>02 / PROBLEM FIRST</span><strong>Pain-Gap<br/><em>Solutions.</em></strong><p>Unexpected ways to solve problems, matched to real needs.</p><b>Explore ↗</b></Link>
    <Link href="/discover?lane=emerging" className="fe-world emerging"><span>03 / WHAT'S NEXT</span><strong>Emerging<br/><em>Discoveries.</em></strong><p>Recently observed products and new ideas, clearly marked as research candidates.</p><b>Explore ↗</b></Link>
   </div>
  </section>
  <section className="fe-section fe-selection"><div className="fe-section-heading"><p>02 — PRODUCT STORIES</p><h2>{c.catalogue}</h2><span>Real catalogue listings · market absence not yet verified across Europe</span></div>
   {showcase.length?<div className="fe-products">{showcase.map(p=><Link href={"/eu/"+country.toLowerCase()+"/product/"+encodeURIComponent(p.source_product_id)} className="fe-product" key={p.source_product_id}><div className="fe-product-media">{p.image_url?<img src={p.image_url} alt={p.title} loading="lazy"/>:<span>◈</span>}</div><div className="fe-product-info"><span>{p.problem_category||p.category||"PRODUCT INTELLIGENCE"}</span><h3>{compactTitle(p.title,84)}</h3><p>{p.problem_title||"Explore the use case and evidence before purchase."}</p><div><strong>{money(p.price_eur)}</strong><b>{c.see} ↗</b></div></div></Link>)}</div>:<div className="fe-noitems">The product catalogue is temporarily unavailable. We will not invent listings.</div>}
  </section>
  <section className="fe-trust" id="trust"><div><p>03 — OUR STANDARD</p><h2>{c.proof}</h2></div><div><article><span>01</span><div><h3>Problem before product.</h3><p>We start from the problem, not an affiliate commission.</p></div></article><article><span>02</span><div><h3>Country-specific research.</h3><p>We separate verified absence in checked sources from unverified market assumptions.</p></div></article><article><span>03</span><div><h3>Evidence before persuasion.</h3><p>Shipping, compliance and seller claims are explicit, with clear unknowns.</p></div></article></div></section>
  <section className="fe-install"><div><p>FOUND. IN YOUR POCKET</p><h2>Discover anywhere.<br/>Keep the conversation going.</h2><span>Fast, responsive and designed for your mobile home screen.</span></div><div className="fe-install-actions">{!installed&&deferred?<button onClick={install}>{c.install} ↗</button>:ios?<p>iPhone / iPad: Safari → Share → Add to Home Screen</p>:<p>{installed?"FOUND. is installed.":"Open your browser menu and choose Install app / Add to Home Screen when available."}</p>}</div></section>
  <footer className="fe-footer"><span>FOUND. EUROPE © 2026</span><span>AI-guided discovery · Affiliate disclosure · Evidence matters</span><a href="#top">Back to top ↑</a></footer>
 </main>;
}
