import Link from "next/link";
import "./opportunities.css";
import {getMarketplaceData,type Product} from "../../lib/products";

export const revalidate=300;
export const metadata={title:"Χάρτης ευκαιριών | FOUND. AXI",description:"Διαδραστικό infographic προβλημάτων, διαθέσιμων λύσεων και ποιότητας τεκμηρίων."};
type Cluster={key:string;title:string;count:number;products:Product[];priceCount:number;affiliateCount:number;signalCount:number};
function keyFor(p:Product){return (p.problem_title||p.problem_category||p.problem_key||p.category||"Αταξινόμητο πρόβλημα").trim().slice(0,90)}
function safeAffiliate(url:string|null){if(!url)return false;try{const u=new URL(url);return u.protocol==="https:"&&["s.click.aliexpress.com","www.aliexpress.com","aliexpress.com"].includes(u.hostname)}catch{return false}}
export default async function OpportunityMap(){
 let products:Product[]=[];let error=false;
 try{products=(await getMarketplaceData()).products.filter(p=>p.title&&p.source_product_id)}catch{error=true}
 const groups=new Map<string,Cluster>();
 for(const p of products){const key=keyFor(p);let group=groups.get(key);
  if(!group){group={key,title:key,count:0,products:[],priceCount:0,affiliateCount:0,signalCount:0};groups.set(key,group)}
  group.count++;if(group.products.length<3)group.products.push(p);
  if(p.price_eur!==null&&p.price_eur!==undefined&&Number(p.price_eur)>0)group.priceCount++;
  if(safeAffiliate(p.promotion_url))group.affiliateCount++;
  if((p.fact_count||0)>0)group.signalCount++;
 }
 const clusters=[...groups.values()].sort((a,b)=>b.count-a.count).slice(0,12);
 const max=Math.max(1,...clusters.map(g=>g.count));
 const total=products.length;
 const priced=products.filter(p=>p.price_eur!==null&&Number(p.price_eur)>0).length;
 const affiliate=products.filter(p=>safeAffiliate(p.promotion_url)).length;
 return <main className="omap">
 <header className="omap-nav"><Link href="/">FOUND<span>.</span></Link><nav><Link href="/catalog">Κατάλογος</Link><Link href="/discover">AXI Agent ↗</Link></nav></header>
 <section className="omap-hero"><p className="omap-kicker">FOUND. / OPPORTUNITY INTELLIGENCE / GREECE</p>
 <h1>Όχι κατηγορίες.<br/><em>Χάρτης αναγκών.</em></h1>
 <p>Από τα προβλήματα των ανθρώπων στις υποψήφιες λύσεις. Τα μεγέθη προκύπτουν από πραγματικές καταχωρίσεις της ενεργής πηγής — δεν αποτελούν αποδεδειγμένη ζήτηση ή AI-επαληθευμένη ευκαιρία.</p>
 <Link className="omap-primary" href="/discover?country=GR&lang=el">Περιέγραψε το πρόβλημά σου στον AXI ↗</Link>
 </section>
 <section className="omap-stats" aria-label="Σήματα καταλόγου">
 <article><span>01 / AVAILABLE</span><strong>{total}</strong><p>Καταχωρίσεις στο ενεργό δείγμα</p></article>
 <article><span>02 / PRICE SIGNAL</span><strong>{priced}</strong><p>Με καταγεγραμμένη τιμή προϊόντος</p></article>
 <article><span>03 / AFFILIATE SIGNAL</span><strong>{affiliate}</strong><p>Με σύνδεσμο συμβατής μορφής, όχι click-tested</p></article>
 <article><span>04 / PROBLEM GROUPS</span><strong>{groups.size}</strong><p>Ομάδες από υπάρχοντα πεδία προβλήματος</p></article>
 </section>
 <section className="omap-content"><div className="omap-heading"><div><p className="omap-kicker">THE PROBLEM LANDSCAPE</p><h2>Πού συγκεντρώνονται οι υποψήφιες λύσεις;</h2></div><p>Το μήκος κάθε μπάρας δείχνει μόνο πλήθος καταχωρίσεων ανά πρόβλημα. Δεν μετρά δημοφιλία, πωλήσεις ή μέγεθος αγοράς.</p></div>
 {error?<p role="status">Η πηγή δεδομένων δεν ανταποκρίνεται. Δεν εμφανίζονται υποθετικές μετρήσεις.</p>:clusters.length===0?<p role="status">Δεν υπάρχουν διαθέσιμα δεδομένα για χαρτογράφηση.</p>:
 <div className="omap-grid">
 <div className="omap-bars">{clusters.map((g,i)=><article key={g.key} className="omap-bar"><div className="omap-bar-top"><span>{String(i+1).padStart(2,"0")} / {g.title}</span><strong>{g.count}</strong></div><div className="omap-track"><div style={{width:(g.count/max*100)+"%"}}/></div><small>{g.priceCount} τιμές · {g.affiliateCount} affiliate μορφές · {g.signalCount} με καταγεγραμμένα facts</small></article>)}</div>
 <aside className="omap-aside"><span>HOW AXI REASONS</span><h3>Ανάγκη → λύση → απόδειξη → απόφαση</h3>
 <div className="omap-step"><b>01</b><div><strong>Ανάγκη</strong><p>Ο χρήστης περιγράφει το πρόβλημα, όχι το προϊόν.</p></div></div>
 <div className="omap-step"><b>02</b><div><strong>Ερμηνεία</strong><p>Ο AXI αναζητά σχετικές λύσεις. Ο παρών χάρτης ομαδοποιεί τα υπάρχοντα πεδία δεδομένων, χωρίς νέα AI ταξινόμηση.</p></div></div>
 <div className="omap-step"><b>03</b><div><strong>Τεκμήρια</strong><p>Τιμή, διαθεσιμότητα, αξιολογήσεις, τελικό κόστος Ελλάδας και συγκρίσιμα SKU ελέγχονται χωριστά.</p></div></div>
 <div className="omap-step"><b>04</b><div><strong>Απόφαση</strong><p>Καμία «ευκαιρία +50%» χωρίς πραγματική σύγκριση και επαρκή στοιχεία.</p></div></div>
 </aside></div>}
 </section>
 <section className="omap-bottom"><div><p className="omap-kicker">DISCOVER BY PAIN, NOT AISLE</p><h2>Εξερεύνησε τις λύσεις πίσω από κάθε πρόβλημα.</h2></div>
 <div className="omap-tiles">{clusters.slice(0,6).map(g=><article key={g.key}><span>PROBLEM CLUSTER</span><h3>{g.title}</h3><p>{g.count} υποψήφιες καταχωρίσεις · {g.affiliateCount} affiliate μορφές</p><Link href={"/discover?country=GR&lang=el&problem="+encodeURIComponent(g.title)}>Ρώτησε τον AXI ↗</Link></article>)}</div>
 </section><footer className="omap-footer">FOUND. · Οι μετρήσεις αφορούν το τρέχον δείγμα του marketplace API, όχι ολόκληρη την ιδιωτική βάση axi. Τα τεκμήρια χρειάζονται ανεξάρτητη επαλήθευση.</footer>
 </main>
}