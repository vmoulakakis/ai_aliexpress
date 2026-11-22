"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {compactTitle,money,n,type Product} from "../lib/products";

type Channel="all"|"premium"|"pain"|"emerging";
type EvidenceProduct=Product&{
  expected_commission_eur?:number|string|null;
  commission_verified?:boolean|null;
  commission_evidence?:unknown;
  greek_absence_verified?:boolean|null;
  eu_compliance_verified?:boolean|null;
  shipping_gr_verified?:boolean|null;
  first_seen_at?:string|null;
  discovered_at?:string|null;
  verified_at?:string|null;
};
const isTrue=(x:unknown)=>x===true;
const hasPain=(p:EvidenceProduct)=>!!(p.problem_title||p.problem_key);
const isNew=(p:EvidenceProduct)=>{
  const date=p.discovered_at||p.first_seen_at;
  if(!date)return false;
  const parsed=Date.parse(date);return Number.isFinite(parsed)&&parsed<=Date.now()&&Date.now()-parsed<=90*86400000;
};
const isPremium=(p:EvidenceProduct)=>n(p.expected_commission_eur)>10&&isTrue(p.commission_verified)&&
  isTrue(p.greek_absence_verified)&&isTrue(p.eu_compliance_verified)&&isTrue(p.shipping_gr_verified)&&
  !!p.promotion_url;
const types:{id:Channel;label:string;subtitle:string}[]=[
  {id:"all",label:"All discoveries",subtitle:"Όλες οι διαθέσιμες υποψήφιες λύσεις"},
  {id:"premium",label:"Premium €10+",subtitle:"Μόνο πλήρως επαληθευμένες προμήθειες και ελληνική σπανιότητα"},
  {id:"pain",label:"Pain Gaps",subtitle:"Προϊόντα που συνδέονται με συγκεκριμένο πρόβλημα"},
  {id:"emerging",label:"Emerging",subtitle:"Πρώτη καταγραφή τις τελευταίες 90 ημέρες, όπου υπάρχουν timestamps"}
];
export default function DiscoveryChannels({products,mode}:{products:Product[];mode:string}){
  const [channel,setChannel]=useState<Channel>("all");
  const [search,setSearch]=useState("");
  const [max,setMax]=useState(24);
  const candidates=useMemo(()=>{
    const seen=new Set<string>();
    return (products as EvidenceProduct[]).filter(p=>{
      if(!p.source_product_id||!p.title)return false;
      const key=String(p.source_product_id);
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
  },[products]);
  const counts={all:candidates.length,premium:candidates.filter(isPremium).length,
    pain:candidates.filter(hasPain).length,emerging:candidates.filter(isNew).length};
  const items=candidates.filter(p=>(channel==="all"||channel==="premium"&&isPremium(p)||channel==="pain"&&hasPain(p)||channel==="emerging"&&isNew(p))&&
    (!search||[p.title,p.problem_title,p.problem_category,p.problem_subcategory].join(" ").toLowerCase().includes(search.trim().toLowerCase())));
  const current=types.find(t=>t.id===channel)!;
  return <main style={{minHeight:"100vh",background:"#090e19",color:"#f0f5ff",fontFamily:"Inter,system-ui,sans-serif"}}>
    <header style={{padding:"22px clamp(20px,5vw,85px)",display:"flex",justifyContent:"space-between",gap:20,alignItems:"center",borderBottom:"1px solid #293447",flexWrap:"wrap"}}>
      <Link href="/" style={{color:"#fff",fontSize:23,fontWeight:900}}>FOUND<span style={{color:"#b7e96a"}}>.</span></Link>
      <span style={{fontSize:12,color:"#afbed4"}}>ALIEXPRESS · GREECE · EVIDENCE FIRST</span>
      <Link href="/" style={{fontSize:13,color:"#b7e96a"}}>← Marketplace</Link>
    </header>
    <section style={{maxWidth:1250,margin:"auto",padding:"76px 22px 30px"}}>
      <p style={{letterSpacing:3,fontSize:11,color:"#b7e96a",fontWeight:800}}>AI GAP HUNTER / DISCOVERY INTELLIGENCE</p>
      <h1 style={{fontSize:"clamp(42px,7vw,92px)",letterSpacing:"-.065em",lineHeight:1.03,maxWidth:980,margin:"18px 0 24px"}}>Find what Greece <em style={{color:"#b7e96a"}}>is missing.</em></h1>
      <p style={{maxWidth:760,color:"#bac6d8",lineHeight:1.7,fontSize:17}}>Ανακαλύπτουμε λύσεις στο AliExpress με πραγματικό πρόβλημα, διαφανή στοιχεία ζήτησης και αυστηρή διασταύρωση. Η έλλειψη αποδείξεων δεν παρουσιάζεται ως επιβεβαίωση.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginTop:36}}>
        {types.map(t=><button key={t.id} type="button" onClick={()=>{setChannel(t.id);setMax(24)}} aria-pressed={channel===t.id}
          style={{textAlign:"left",cursor:"pointer",border:"1px solid "+(channel===t.id?"#b7e96a":"#344158"),background:channel===t.id?"#24331e":"#131c2c",color:"#fff",padding:22,borderRadius:16}}>
          <span style={{display:"block",fontSize:13,fontWeight:800,marginBottom:12}}>{t.label}</span>
          <strong style={{fontSize:36,color:channel===t.id?"#b7e96a":"#fff"}}>{counts[t.id]}</strong>
          <small style={{display:"block",color:"#bac6d8",lineHeight:1.5,marginTop:9}}>{t.subtitle}</small>
        </button>)}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,margin:"38px 0 18px",flexWrap:"wrap"}}>
        <div><h2 style={{margin:"0 0 6px",fontSize:26}}>{current.label}</h2><span style={{fontSize:12,color:"#afbed4"}}>{items.length} results · Source: {mode}</span></div>
        <input aria-label="Search discoveries" placeholder="Πρόβλημα, χαρακτηριστικό ή προϊόν..." value={search} onChange={e=>{setSearch(e.target.value);setMax(24)}}
          style={{border:"1px solid #39485d",color:"#fff",background:"#172234",borderRadius:12,padding:"15px 17px",width:"min(100%,380px)"}}/>
      </div>
      {channel==="premium"&&<p style={{padding:17,border:"1px solid #395343",borderRadius:12,color:"#c7dccb",background:"#17251c",lineHeight:1.6}}>
        Premium = επιβεβαιωμένη προμήθεια &gt;€10, σπανιότητα στην Ελλάδα, EU compliance, αποστολή στην Ελλάδα και ενεργό affiliate link. Αν τα αποδεικτικά πεδία λείπουν, δεν δημοσιεύουμε το προϊόν ως Premium.</p>}
      {channel==="emerging"&&<p style={{color:"#b9c6d8",fontSize:13,lineHeight:1.6}}>«Emerging» σημαίνει πρώτη καταγραφή στο σύστημα εντός 90 ημερών, όχι κατ’ ανάγκη πρώτη κυκλοφορία του κατασκευαστή.</p>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,275px),1fr))",gap:16,marginTop:24}}>
        {items.slice(0,max).map(p=><Link key={p.source_product_id} href={"/product/"+encodeURIComponent(p.source_product_id)}
          style={{background:"#142033",border:"1px solid #2d3a4e",borderRadius:18,overflow:"hidden",display:"flex",flexDirection:"column",color:"#fff"}}>
          <div style={{height:240,background:"#f1f3f3",display:"grid",placeItems:"center"}}>
            {p.image_url?<img src={p.image_url} alt={p.title} loading="lazy" style={{width:"90%",height:"90%",objectFit:"contain"}}/>:<span style={{color:"#566"}}>Image pending</span>}
          </div>
          <div style={{padding:19,display:"flex",flexDirection:"column",gap:10,flex:1}}>
            <span style={{color:"#b7e96a",fontSize:10,letterSpacing:1.5,textTransform:"uppercase"}}>{p.problem_category||"Product discovery"}</span>
            {p.problem_title&&<p style={{color:"#bac6d8",fontSize:13,margin:0}}>{p.problem_title}</p>}
            <h3 style={{fontSize:17,lineHeight:1.4,margin:0}}>{compactTitle(p.title,85)}</h3>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"auto",paddingTop:10}}>
              <strong style={{fontSize:23}}>{money(p.price_eur)}</strong>
              <span style={{fontSize:11,color:"#b7e96a"}}>Explore →</span>
            </div>
            <small style={{color:"#97a8bf"}}>{isPremium(p)?"Premium verified":isNew(p)?"Recently discovered":"Research candidate · verify before purchase"}</small>
          </div>
        </Link>)}
      </div>
      {items.length===0&&<div role="status" style={{textAlign:"center",padding:"80px 18px",color:"#b8c8da",border:"1px dashed #354256",borderRadius:15}}>
        <h3 style={{color:"#fff",fontSize:24}}>Δεν υπάρχουν ακόμη επαληθευμένα αποτελέσματα για αυτή την επιλογή.</h3>
        <p>Δεν κατασκευάζουμε προϊόντα, προμήθειες ή αποδείξεις. Τα αποτελέσματα εμφανίζονται μόλις υπάρχουν κατάλληλα δεδομένα.</p>
      </div>}
      {items.length>max&&<div style={{textAlign:"center",margin:"35px 0 70px"}}><button onClick={()=>setMax(v=>v+24)} style={{padding:"15px 28px",background:"#b7e96a",color:"#0d1724",fontWeight:800,border:0,borderRadius:9,cursor:"pointer"}}>Περισσότερες λύσεις ↓</button></div>}
    </section>
    <footer style={{borderTop:"1px solid #2d3a4e",padding:"28px 5vw",fontSize:12,color:"#9fb0c7"}}>FOUND. · Affiliate links may earn a commission. Product claims require source verification. EU warehouse ≠ EU compliance.</footer>
  </main>;
}
