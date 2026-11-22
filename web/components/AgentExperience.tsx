"use client";
import {useState,useRef,useEffect,type FormEvent} from "react";
import Link from "next/link";
import type {Product} from "../lib/products";
import {money,compactTitle} from "../lib/products";
import "./AgentExperience.css";

type Message={role:"user"|"assistant";content:string};
type Pick={id:string;title:string;image_url:string|null;price_eur:string|number|null;category:string|null;url:string;verified:boolean};
type Channel="premium"|"pain"|"emerging";
const prompts=[
 {icon:"↗",title:"Δεν βρίσκω λύση στην Ελλάδα",prompt:"Ψάχνω μια εξειδικευμένη λύση που δεν βρίσκω σε ελληνικά καταστήματα. Μπορείς να με βοηθήσεις να την ανακαλύψω;"},
 {icon:"⌂",title:"Λύνω πρόβλημα στο σπίτι",prompt:"Χρειάζομαι μια πρωτότυπη λύση για ένα καθημερινό πρόβλημα στο σπίτι. Ρώτησέ με ό,τι χρειάζεται."},
 {icon:"✳",title:"Θέλω τα νέα tech discoveries",prompt:"Δείξε μου τις πιο νέες τεχνολογικές λύσεις που έχεις με πραγματικά στοιχεία, χωρίς να επινοείς διαθεσιμότητα."},
 {icon:"◇",title:"Ψάχνω εξειδικευμένο εργαλείο",prompt:"Θέλω εξειδικευμένο εργαλείο επισκευής ή τεχνολογίας. Βοήθησέ με να βρω την κατάλληλη κατηγορία."}
];
function isEmerging(p:Product){const t=String((p as Product&{first_seen_at?:string;discovered_at?:string}).first_seen_at||(p as Product&{discovered_at?:string}).discovered_at||"");if(!t)return false;const date=Date.parse(t);return Number.isFinite(date)&&date<=Date.now()&&Date.now()-date<90*86400000;}
function isPremium(p:Product){const x=p as Product&{commission_verified?:boolean;expected_commission_eur?:number;greek_absence_verified?:boolean;eu_compliance_verified?:boolean;shipping_gr_verified?:boolean};
return x.commission_verified===true&&Number(x.expected_commission_eur)>10&&x.greek_absence_verified===true&&x.eu_compliance_verified===true&&x.shipping_gr_verified===true&&!!p.promotion_url;}
export default function AgentExperience({products}:{products:Product[]}){
 const [messages,setMessages]=useState<Message[]>([]);
 const [picks,setPicks]=useState<Pick[]>([]);
 const [input,setInput]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [channel,setChannel]=useState<Channel>("pain");
 const end=useRef<HTMLDivElement>(null);
 useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[messages,busy,picks]);
 const valid=products.filter(p=>p.title&&p.source_product_id);
 const rail=valid.filter(p=>channel==="premium"?isPremium(p):channel==="emerging"?isEmerging(p):!!p.problem_title).slice(0,6);
 const counts={premium:valid.filter(isPremium).length,pain:valid.filter(p=>!!p.problem_title).length,emerging:valid.filter(isEmerging).length};
 async function submit(value:string){
   const q=value.trim().slice(0,750);if(!q||busy)return;
   const next=[...messages,{role:"user",content:q} as Message].slice(-6);
   setMessages(prev=>[...prev,{role:"user",content:q}]);setInput("");setBusy(true);setError("");setPicks([]);
   try{
     const r=await fetch("/api/agent",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:next})});
     const j=await r.json();
     if(!r.ok)throw Error(j.message||"Ο AI agent δεν είναι διαθέσιμος αυτή τη στιγμή.");
     setMessages(prev=>[...prev,{role:"assistant",content:String(j.answer||"")}]);setPicks(j.products||[]);
   }catch(e){setError(e instanceof Error?e.message:"Αποτυχία σύνδεσης με τον AI agent.");}
   finally{setBusy(false);}
 }
 function onSubmit(e:FormEvent<HTMLFormElement>){e.preventDefault();void submit(input);}
 const showWelcome=messages.length===0;
 return <main className="hx">
  <header className="hx-header"><Link href="/" className="hx-logo" aria-label="FOUND home">F<span>O</span>UND<sup>®</sup></Link><nav aria-label="Main navigation"><a href="#agent">AI Consultant</a><a href="#discover">Discoveries</a><a href="#principles">Our standard</a></nav><div className="hx-live"><span className="hx-live-dot"/>GREECE · AI COMMERCE</div></header>
  <section className="hx-hero" id="agent">
    <div className="hx-eyebrow"><span>01 / INTELLIGENCE, NOT INFINITE SCROLL</span><span>THE ART OF FINDING BETTER</span></div>
    <div className="hx-hero-grid">
     <div className="hx-left">
      <div className="hx-orbit" aria-hidden="true"><div className="hx-orbit-a"/><div className="hx-orbit-b"/><div className="hx-center">✳</div><span className="hx-orbit-tag tag-a">DISCOVER</span><span className="hx-orbit-tag tag-b">DECODE</span><span className="hx-orbit-tag tag-c">VERIFY</span></div>
      <h1>Don’t search<br/>for products.<br/><em>Solve something.</em></h1>
      <p className="hx-lead">Πες μας τι σε δυσκολεύει. Ο AI consultant ερευνά το πρόβλημα, εντοπίζει υποψήφιες λύσεις και σου δείχνει τι γνωρίζουμε — και τι δεν έχει ακόμη επαληθευτεί.</p>
      <div className="hx-hero-foot"><span>REAL PAINS</span><span>REAL PRODUCT DATA</span><span>NO INVENTED PROOF</span></div>
     </div>
     <section className="hx-console" aria-label="AI problem solving consultant">
      <div className="hx-console-top"><div><span className="hx-pulse"/> <strong>GAP / INTELLIGENCE</strong><small>Personal discovery agent</small></div><span className="hx-status">BETA · LIVE MODEL REQUIRES CONFIG</span></div>
      <div className="hx-chat" role="log" aria-live="polite" aria-label="Conversation">
        {showWelcome?<div className="hx-start">
          <div className="hx-ai-symbol">✳</div><p className="hx-step">YOUR PROBLEM IS THE PROMPT</p>
          <h2>Τι θα ήθελες<br/><i>να λύσεις;</i></h2>
          <p>Δεν χρειάζεται να ξέρεις ποιο προϊόν ψάχνεις. Ξεκίνα από τη δυσκολία σου.</p>
          <div className="hx-prompts">{prompts.map(x=><button type="button" key={x.title} onClick={()=>void submit(x.prompt)} disabled={busy}><span>{x.icon}</span>{x.title}<b>↗</b></button>)}</div>
        </div>:<div className="hx-transcript">{messages.map((m,i)=><div key={i} className={"hx-message "+m.role}><div className="hx-speaker">{m.role==="assistant"?"✳ AI ANALYSIS":"YOU"}</div><p>{m.content}</p></div>)}{busy&&<div className="hx-thinking" role="status"><span className="hx-pulse"/> Ο agent αναζητά στοιχεία καταλόγου και αξιολογεί πιθανές λύσεις…</div>}{error&&<div className="hx-error" role="alert">{error}<button type="button" onClick={()=>void submit(messages[messages.length-1]?.role==="user"?messages[messages.length-1].content:input)} disabled={busy}>Δοκίμασε ξανά ↗</button></div>}
          {!!picks.length&&<div className="hx-picks"><h3>Προϊόντα για περαιτέρω έλεγχο</h3>{picks.map(p=><Link href={p.url} key={p.id} className="hx-pick">{p.image_url?<img src={p.image_url} alt="" loading="lazy"/>:<div className="hx-pick-img">◈</div>}<span>{compactTitle(p.title,70)}<small>Ανεπιβεβαίωτη διαθεσιμότητα / προμήθεια</small></span><b>{money(p.price_eur)}</b></Link>)}</div>}<div ref={end}/></div>}
      </div>
      <form className="hx-compose" onSubmit={onSubmit}><label htmlFor="hx-input" className="hx-visually-hidden">Περιέγραψε το πρόβλημα</label><textarea id="hx-input" rows={2} maxLength={750} value={input} onChange={e=>setInput(e.target.value)} placeholder="Περιέγραψε το πρόβλημά σου…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submit(input)}}} disabled={busy}/><button aria-label="Αποστολή στον AI agent" type="submit" disabled={busy||!input.trim()}>{busy?"···":"↗"}</button></form>
      <div className="hx-console-end">Ενδέχεται να κερδίσουμε affiliate προμήθεια · Οι συστάσεις απαιτούν έλεγχο.</div>
     </section>
    </div>
  </section>
  <div className="hx-marquee" aria-label="How we work"><span>PAIN FIRST</span><span>✳</span><span>INTELLIGENT DISCOVERY</span><span>✳</span><span>GREEK MARKET EVIDENCE</span><span>✳</span><span>BETTER DECISIONS</span></div>
  <section className="hx-discover" id="discover"><div className="hx-section-head"><span className="hx-section-num">02 / WHAT WE FIND</span><h2>Three ways to<br/><i>discover better.</i></h2><p>Από σπάνιες high-value λύσεις έως τις πιο πρόσφατες ανακαλύψεις. Το τι είναι επαληθευμένο παραμένει διακριτό από αυτό που ερευνάται.</p></div>
   <div className="hx-tabs" role="group" aria-label="Discovery channel">
    <button onClick={()=>setChannel("premium")} aria-pressed={channel==="premium"}><b>01</b> Premium Exclusive <span>{counts.premium}</span></button>
    <button onClick={()=>setChannel("pain")} aria-pressed={channel==="pain"}><b>02</b> Pain-Gap Solutions <span>{counts.pain}</span></button>
    <button onClick={()=>setChannel("emerging")} aria-pressed={channel==="emerging"}><b>03</b> Emerging Finds <span>{counts.emerging}</span></button>
   </div>
   <div className="hx-rail">{rail.length?rail.map((p,i)=><Link key={p.source_product_id} href={"/product/"+encodeURIComponent(p.source_product_id)} className="hx-product"><div className="hx-product-image">{p.image_url?<img src={p.image_url} alt={p.title} loading="lazy"/>:<span>◈</span>}<small>DISCOVERY / {String(i+1).padStart(2,"0")}</small></div><div className="hx-product-copy"><span>{p.problem_category||p.category||"SPECIALTY FIND"}</span><h3>{compactTitle(p.title,80)}</h3><p>{p.problem_title||"Στοιχεία συμβατότητας και διαθεσιμότητας χρειάζονται έλεγχο."}</p><div><b>{money(p.price_eur)}</b><strong>Explore ↗</strong></div></div></Link>):<div className="hx-empty"><span>∅</span><h3>No verified matches. Yet.</h3><p>{channel==="premium"?"Δεν υπάρχουν ακόμη προϊόντα με επαληθευμένη προμήθεια >€10, ευρωπαϊκή συμμόρφωση και μη εντοπισμένη ελληνική προσφορά.":channel==="emerging"?"Δεν υπάρχουν τεκμηριωμένες ημερομηνίες πρώτης καταγραφής για τις διαθέσιμες επιλογές.":"Δεν υπάρχουν καταχωρισμένες λύσεις για αυτό το κανάλι."}</p></div>}</div>
   <Link href="/discover" className="hx-all">View the discovery archive <span>↗</span></Link>
  </section>
  <section className="hx-proof" id="principles"><div><span className="hx-section-num">03 / THE STANDARD</span><h2>Less hype.<br/><i>More evidence.</i></h2></div><div className="hx-proof-list"><article><span>01</span><div><h3>Understand the problem</h3><p>Ξεκινάμε από την ανάγκη, όχι από μια δημοφιλή φωτογραφία προϊόντος.</p></div></article><article><span>02</span><div><h3>Research the Greek gap</h3><p>Η ελληνική διαθεσιμότητα εξετάζεται. Δεν βαφτίζουμε «αποκλειστικό» ό,τι δεν ελέγξαμε.</p></div></article><article><span>03</span><div><h3>Show the unknowns</h3><p>Προμήθεια, αποστολή, ποιότητα και ευρωπαϊκή συμμόρφωση παρουσιάζονται ως επαληθευμένα μόνο όταν υπάρχουν τεκμήρια.</p></div></article></div></section>
  <footer className="hx-footer"><Link href="/" className="hx-logo">FOUND<span>O</span>®</Link><span>CURIOUS BY DESIGN · CRITICAL BY DEFAULT</span><span>© 2026 FOUND.</span></footer>
 </main>;
}
