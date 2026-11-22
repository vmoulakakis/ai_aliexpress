"use client";
import {useState,useRef,useEffect,type FormEvent} from "react";
import Link from "next/link";
import type {Product} from "../lib/products";
import {money,compactTitle} from "../lib/products";
import "./AgentExperience.css";

type Message={role:"user"|"assistant";content:string};
type Pick={id:string;title:string;image_url:string|null;price_eur:string|number|null;category:string|null;url:string;verified:boolean};
type Channel="premium"|"pain"|"emerging";
const L10N:Record<string,Record<string,string>>={
 el:{hero:"Μην ψάχνεις προϊόντα. Βρες λύσεις.",lead:"Πες μας τι σε δυσκολεύει. Ο AXI εξετάζει πραγματικά δεδομένα και δείχνει τι έχει και τι δεν έχει επαληθευτεί.",greeting:"Τι θα ήθελες να λύσεις;",hint:"Δεν χρειάζεται να γνωρίζεις το προϊόν. Ξεκίνα από το πρόβλημα.",placeholder:"Περιέγραψε το πρόβλημα…",waiting:"Ο AXI εξετάζει διαθέσιμα τεκμήρια και προϊόντα…",fallback:"Ο AI provider δεν ανταποκρίθηκε. Δεν έγινε νέα έρευνα. Μπορώ να συνεχίσω με μερικές ερωτήσεις: χρειάζεσαι λύση για σπίτι, κατοικίδια, τεχνολογία ή εργασία;",more:"Δοκίμασε ξανά",products:"Προϊόντα για περαιτέρω έλεγχο",unknown:"Αποστολή, σπανιότητα και προμήθεια μη επαληθευμένες",scarcity:"Η σπανιότητα ελέγχεται ανά χώρα και marketplace, όχι γενικά για όλη την Ευρώπη."},
 en:{hero:"Don't search for products. Solve something.",lead:"Tell AXI what you need. We investigate real catalogue evidence and make the unknowns explicit.",greeting:"What would you like to solve?",hint:"You don't need to know the product name. Start with your problem.",placeholder:"Describe your problem…",waiting:"AXI is examining available evidence and products…",fallback:"The AI provider is temporarily unavailable, so no fresh product research was completed. Let's narrow the problem: home, pets, technology or professional tools?",more:"Try again",products:"Products to investigate",unknown:"Shipping, scarcity and commission not yet verified",scarcity:"Scarcity is researched country by country, not claimed across all of Europe."},
 de:{hero:"Suche nicht nach Produkten. Finde Lösungen.",lead:"Beschreibe AXI dein Problem. Wir prüfen echte Katalogdaten und zeigen offen, was noch ungeklärt ist.",greeting:"Was möchtest du lösen?",hint:"Du musst den Produktnamen nicht kennen. Beginne mit deinem Problem.",placeholder:"Beschreibe dein Problem…",waiting:"AXI untersucht verfügbare Produktdaten und Nachweise…",fallback:"Der KI-Dienst ist vorübergehend nicht verfügbar. Es wurde keine neue Recherche durchgeführt. Geht es um Haushalt, Haustiere, Technik oder berufliche Werkzeuge?",more:"Erneut versuchen",products:"Produkte zur weiteren Prüfung",unknown:"Versand, Seltenheit und Provision nicht verifiziert",scarcity:"Die Verfügbarkeit wird je Land geprüft, nicht pauschal für Europa."},
 fr:{hero:"Ne cherchez plus un produit. Trouvez une solution.",lead:"Décrivez votre problème à AXI. Nous examinons les données réelles et signalons clairement les informations non vérifiées.",greeting:"Quel problème souhaitez-vous résoudre ?",hint:"Vous n'avez pas besoin de connaître le nom du produit. Partez de votre besoin.",placeholder:"Décrivez votre problème…",waiting:"AXI examine les données et les preuves disponibles…",fallback:"Le service IA est temporairement indisponible. Aucune nouvelle recherche n'a été effectuée. Votre besoin concerne-t-il la maison, les animaux, la technologie ou les outils professionnels ?",more:"Réessayer",products:"Produits à examiner",unknown:"Livraison, rareté et commission non vérifiées",scarcity:"La rareté est étudiée pays par pays, pas affirmée pour toute l'Europe."}
};
const STARTERS:Record<string,{title:string;prompt:string}[]>={
 el:[{title:"Δεν το βρίσκω στη χώρα μου",prompt:"Ψάχνω μια λύση που δύσκολα βρίσκω στη χώρα μου."},{title:"Λύνω πρόβλημα στο σπίτι",prompt:"Χρειάζομαι μια λύση για ένα καθημερινό πρόβλημα στο σπίτι."},{title:"Νέες τεχνολογίες",prompt:"Ποιες νέες και ασυνήθιστες τεχνολογίες μπορούν να λύσουν το πρόβλημά μου;"},{title:"Εξειδικευμένα εργαλεία",prompt:"Χρειάζομαι εξειδικευμένο εργαλείο. Κάνε μου τις κατάλληλες ερωτήσεις."}],
 en:[{title:"Hard to find in my country",prompt:"I need a product that is hard to find in my country."},{title:"Solve a home problem",prompt:"Help me solve an everyday problem at home."},{title:"Emerging technologies",prompt:"Help me discover a useful new technology."},{title:"Specialist tools",prompt:"I need a specialist tool. Ask me what matters."}],
 de:[{title:"Schwer zu finden",prompt:"Ich suche eine Lösung, die in meinem Land schwer zu finden ist."},{title:"Problem im Haushalt",prompt:"Ich brauche eine Lösung für ein Problem zu Hause."},{title:"Neue Technologien",prompt:"Ich möchte eine nützliche neue Technologie entdecken."},{title:"Spezialwerkzeuge",prompt:"Ich brauche ein Spezialwerkzeug. Bitte stelle mir passende Fragen."}],
 fr:[{title:"Difficile à trouver",prompt:"Je cherche une solution difficile à trouver dans mon pays."},{title:"Problème à la maison",prompt:"J'ai besoin d'une solution à un problème quotidien."},{title:"Nouvelles technologies",prompt:"Je souhaite découvrir une technologie récente et utile."},{title:"Outils spécialisés",prompt:"Je cherche un outil spécialisé. Posez-moi les bonnes questions."}]
};

const prompts=[
 {icon:"↗",title:"Δεν βρίσκω λύση στην Ελλάδα",prompt:"Ψάχνω μια εξειδικευμένη λύση που δεν βρίσκω σε ελληνικά καταστήματα. Μπορείς να με βοηθήσεις να την ανακαλύψω;"},
 {icon:"⌂",title:"Λύνω πρόβλημα στο σπίτι",prompt:"Χρειάζομαι μια πρωτότυπη λύση για ένα καθημερινό πρόβλημα στο σπίτι. Ρώτησέ με ό,τι χρειάζεται."},
 {icon:"✳",title:"Θέλω τα νέα tech discoveries",prompt:"Δείξε μου τις πιο νέες τεχνολογικές λύσεις που έχεις με πραγματικά στοιχεία, χωρίς να επινοείς διαθεσιμότητα."},
 {icon:"◇",title:"Ψάχνω εξειδικευμένο εργαλείο",prompt:"Θέλω εξειδικευμένο εργαλείο επισκευής ή τεχνολογίας. Βοήθησέ με να βρω την κατάλληλη κατηγορία."}
];
function isEmerging(p:Product){const t=String((p as Product&{first_seen_at?:string;discovered_at?:string}).first_seen_at||(p as Product&{discovered_at?:string}).discovered_at||"");if(!t)return false;const date=Date.parse(t);return Number.isFinite(date)&&date<=Date.now()&&Date.now()-date<90*86400000;}
type Opportunity={source_product_id:string;country_code:string;estimated_commission_eur:number|null;scarcity_status:string;market_checked_at:string|null;estimate_type:"estimated";};
function hasScarcityProof(o:Opportunity|undefined){return !!o&&["hard_to_find","not_found_in_checked_sources"].includes(o.scarcity_status)&&!!o.market_checked_at;}
function isPremium(p:Product,o:Opportunity|undefined){return !!p.promotion_url&&hasScarcityProof(o)&&Number(o?.estimated_commission_eur)>10;}
export default function AgentExperience({products,initialCountry="GR",initialCity="",initialPrompt="",initialLane="pain",initialLocale="el",opportunities=[]}:{products:Product[];initialCountry?:string;initialCity?:string;initialPrompt?:string;initialLane?:string;initialLocale?:string;opportunities?:Opportunity[]}){
 const tr=L10N[initialLocale]||L10N.en;
 const starters=STARTERS[initialLocale]||STARTERS.en;
 const [messages,setMessages]=useState<Message[]>([]);
 const [picks,setPicks]=useState<Pick[]>([]);
 const [input,setInput]=useState(initialPrompt);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [channel,setChannel]=useState<Channel>(initialLane==="premium"||initialLane==="emerging"?initialLane:"pain");
 const end=useRef<HTMLDivElement>(null);const autoStarted=useRef(false);
 useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[messages,busy,picks]);
 const valid=products.filter(p=>p.title&&p.source_product_id);
 const opportunityMap=new Map(opportunities.filter(x=>x.country_code===initialCountry).map(x=>[x.source_product_id,x]));
 const rail=valid.filter(p=>channel==="premium"?isPremium(p,opportunityMap.get(p.source_product_id)):channel==="emerging"?isEmerging(p):!!p.problem_title).slice(0,6);
 const counts={premium:valid.filter(p=>isPremium(p,opportunityMap.get(p.source_product_id))).length,pain:valid.filter(p=>!!p.problem_title).length,emerging:valid.filter(isEmerging).length};
 async function submit(value:string){
   const q=value.trim().slice(0,750);if(!q||busy)return;
   const next=[...messages,{role:"user",content:q} as Message].slice(-6);
   const marketContext="[User-selected market: "+initialCountry+", "+initialCity.slice(0,55)+". Preferred reply language: "+initialLocale+". Verify local evidence; do not invent market availability.] ";
   const requestMessages=next.map((m,i)=>i===next.length-1?{...m,content:(marketContext+q).slice(0,750)}:m);
   setMessages(prev=>[...prev,{role:"user",content:q}]);setInput("");setBusy(true);setError("");setPicks([]);
   try{
     const r=await fetch("/api/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:requestMessages})});
     const j=await r.json();
     if(!r.ok)throw Error(j.message||"Ο AI agent δεν είναι διαθέσιμος αυτή τη στιγμή.");
     setMessages(prev=>[...prev,{role:"assistant",content:String(j.answer||"")}]);setPicks(j.products||[]);
   }catch(e){
     const fallback=tr.fallback;
     setMessages(prev=>[...prev,{role:"assistant",content:fallback}]);
     setError(tr.fallback);
   }
   finally{setBusy(false);}
 }
 useEffect(()=>{if(initialPrompt.trim()&&!autoStarted.current){autoStarted.current=true;void submit(initialPrompt)}},[]);
 function onSubmit(e:FormEvent<HTMLFormElement>){e.preventDefault();void submit(input);}
 const showWelcome=messages.length===0;
 return <main className="hx">
  <header className="hx-header"><Link href="/" className="hx-logo" aria-label="FOUND home">F<span>O</span>UND<sup>®</sup></Link><nav aria-label="Main navigation"><a href="#agent">AI Consultant</a><a href="#discover">Discoveries</a><a href="#principles">Our standard</a></nav><div className="hx-live"><span className="hx-live-dot"/>EUROPE · {initialCountry}</div></header>
  <section className="hx-hero" id="agent">
    <div className="hx-eyebrow"><span>01 / INTELLIGENCE, NOT INFINITE SCROLL</span><span>THE ART OF FINDING BETTER</span></div>
    <div className="hx-hero-grid">
     <div className="hx-left">
      <div className="hx-orbit" aria-hidden="true"><div className="hx-orbit-a"/><div className="hx-orbit-b"/><div className="hx-center">✳</div><span className="hx-orbit-tag tag-a">DISCOVER</span><span className="hx-orbit-tag tag-b">DECODE</span><span className="hx-orbit-tag tag-c">VERIFY</span></div>
      <h1>{tr.hero}</h1>
      <p className="hx-lead">{tr.lead}</p>
      <div className="hx-hero-foot"><span>REAL PAINS</span><span>REAL PRODUCT DATA</span><span>NO INVENTED PROOF</span></div>
     </div>
     <section className="hx-console" aria-label="AI problem solving consultant">
      <div className="hx-console-top"><div><span className="hx-pulse"/> <strong>GAP / INTELLIGENCE</strong><small>Personal discovery agent</small></div><span className="hx-status">AI CONSULTANT · BETA</span></div>
      <div className="hx-chat" role="log" aria-live="polite" aria-label="Conversation">
        {showWelcome?<div className="hx-start">
          <div className="hx-ai-symbol">✳</div><p className="hx-step">YOUR PROBLEM IS THE PROMPT</p>
          <h2>{tr.greeting}</h2>
          <p>{tr.hint}</p>
          <div className="hx-prompts">{starters.map((x,i)=><button type="button" key={x.title} onClick={()=>void submit(x.prompt)} disabled={busy}><span>{["↗","⌂","✳","◇"][i]}</span>{x.title}<b>↗</b></button>)}</div>
        </div>:<div className="hx-transcript">{messages.map((m,i)=><div key={i} className={"hx-message "+m.role}><div className="hx-speaker">{m.role==="assistant"?"✳ AI ANALYSIS":"YOU"}</div><p>{m.content}</p></div>)}{busy&&<div className="hx-thinking" role="status"><span className="hx-pulse"/> {tr.waiting}</div>}{error&&<div className="hx-error" role="alert">{error}<button type="button" onClick={()=>void submit(messages[messages.length-1]?.role==="user"?messages[messages.length-1].content:input)} disabled={busy}>{tr.more} ↗</button></div>}
          {!!picks.length&&<div className="hx-picks"><h3>{tr.products}</h3>{picks.map(p=><Link href={"/eu/"+initialCountry.toLowerCase()+"/product/"+encodeURIComponent(p.id)} key={p.id} className="hx-pick">{p.image_url?<img src={p.image_url} alt="" loading="lazy"/>:<div className="hx-pick-img">◈</div>}<span>{compactTitle(p.title,70)}<small>{tr.unknown}</small></span><b>{money(p.price_eur)}</b></Link>)}</div>}<div ref={end}/></div>}
      </div>
      <form className="hx-compose" onSubmit={onSubmit}><label htmlFor="hx-input" className="hx-visually-hidden">Περιέγραψε το πρόβλημα</label><textarea id="hx-input" rows={2} maxLength={750} value={input} onChange={e=>setInput(e.target.value)} placeholder={tr.placeholder} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submit(input)}}} disabled={busy}/><button aria-label="Αποστολή στον AI agent" type="submit" disabled={busy||!input.trim()}>{busy?"···":"↗"}</button></form>
      <div className="hx-console-end">Ενδέχεται να κερδίσουμε affiliate προμήθεια · Οι συστάσεις απαιτούν έλεγχο.</div>
     </section>
    </div>
  </section>
  <div className="hx-marquee" aria-label="How we work"><span>PAIN FIRST</span><span>✳</span><span>INTELLIGENT DISCOVERY</span><span>✳</span><span>EUROPEAN MARKET EVIDENCE</span><span>✳</span><span>BETTER DECISIONS</span></div>
  <section className="hx-discover" id="discover"><div className="hx-section-head"><span className="hx-section-num">02 / WHAT WE FIND</span><h2>Three ways to<br/><i>discover better.</i></h2><p>Από σπάνιες high-value λύσεις έως τις πιο πρόσφατες ανακαλύψεις. Το τι είναι επαληθευμένο παραμένει διακριτό από αυτό που ερευνάται.</p></div>
   <div className="hx-tabs" role="group" aria-label="Discovery channel">
    <button onClick={()=>setChannel("premium")} aria-pressed={channel==="premium"}><b>01</b> Premium Exclusive <span>{counts.premium}</span></button>
    <button onClick={()=>setChannel("pain")} aria-pressed={channel==="pain"}><b>02</b> Pain-Gap Solutions <span>{counts.pain}</span></button>
    <button onClick={()=>setChannel("emerging")} aria-pressed={channel==="emerging"}><b>03</b> Emerging Finds <span>{counts.emerging}</span></button>
   </div>
   <div className="hx-rail">{rail.length?rail.map((p,i)=><Link key={p.source_product_id} href={"/eu/"+initialCountry.toLowerCase()+"/product/"+encodeURIComponent(p.source_product_id)} className="hx-product"><div className="hx-product-image">{p.image_url?<img src={p.image_url} alt={p.title} loading="lazy"/>:<span>◈</span>}<small>DISCOVERY / {String(i+1).padStart(2,"0")}</small></div><div className="hx-product-copy"><span>{p.problem_category||p.category||"SPECIALTY FIND"}</span><h3>{compactTitle(p.title,80)}</h3><p>{p.problem_title||"Στοιχεία συμβατότητας και διαθεσιμότητας χρειάζονται έλεγχο."}</p><div><b>{money(p.price_eur)}</b><strong>Explore ↗</strong></div></div></Link>):<div className="hx-empty"><span>∅</span><h3>No verified matches. Yet.</h3><p>{channel==="premium"?"No products have both a calculated commission above €10 and current evidence of being hard to find in this market.":channel==="emerging"?"Δεν υπάρχουν τεκμηριωμένες ημερομηνίες πρώτης καταγραφής για τις διαθέσιμες επιλογές.":"Δεν υπάρχουν καταχωρισμένες λύσεις για αυτό το κανάλι."}</p></div>}</div>
   <Link href={"/discover?country="+initialCountry} className="hx-all">View the discovery archive <span>↗</span></Link>
  </section>
  <section className="hx-proof" id="principles"><div><span className="hx-section-num">03 / THE STANDARD</span><h2>Less hype.<br/><i>More evidence.</i></h2></div><div className="hx-proof-list"><article><span>01</span><div><h3>Understand the problem</h3><p>Ξεκινάμε από την ανάγκη, όχι από μια δημοφιλή φωτογραφία προϊόντος.</p></div></article><article><span>02</span><div><h3>Research the Greek gap</h3><p>{tr.scarcity}</p></div></article><article><span>03</span><div><h3>Show the unknowns</h3><p>Προμήθεια, αποστολή, ποιότητα και ευρωπαϊκή συμμόρφωση παρουσιάζονται ως επαληθευμένα μόνο όταν υπάρχουν τεκμήρια.</p></div></article></div></section>
  <footer className="hx-footer"><Link href="/" className="hx-logo">FOUND<span>O</span>®</Link><span>CURIOUS BY DESIGN · CRITICAL BY DEFAULT</span><span>© 2026 FOUND.</span></footer>
 </main>;
}
