import Link from "next/link";
import {getMarketplaceData,compactTitle,money,type Product} from "../../lib/products";

export const revalidate=300;
export const metadata={title:"Εξερεύνηση προϊόντων | FOUND.",description:"Πραγματικά προϊόντα, διαφανή στοιχεία και σαφείς περιορισμοί επαλήθευσης."};

function validAffiliate(url:string|null|undefined){
 if(!url)return null;
 try{
  const u=new URL(url);
  return u.protocol==="https:" && (u.hostname==="s.click.aliexpress.com" || u.hostname==="www.aliexpress.com" || u.hostname==="aliexpress.com") ? u.toString():null;
 }catch{return null;}
}
export default async function CatalogPage(){
 let products:Product[]=[];let unavailable=false;
 try{products=(await getMarketplaceData()).products.filter(p=>p.source_product_id&&p.title).slice(0,120)}
 catch{unavailable=true}
 return <main style={{background:"#f6f5ef",color:"#112137",minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
  <header style={{padding:"24px max(5vw,20px)",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #d7d9d3"}}>
   <Link href="/" style={{fontWeight:900,fontSize:28,letterSpacing:"-.08em"}}>FOUND<span style={{color:"#638d56"}}>.</span></Link>
   <Link href="/discover" style={{background:"#112137",color:"white",padding:"12px 20px",borderRadius:20}}>Ρώτησε τον AXI ↗</Link>
  </header>
  <section style={{maxWidth:1240,margin:"auto",padding:"68px 24px 35px"}}>
   <p style={{fontSize:12,letterSpacing:3,color:"#4c7766",fontWeight:800}}>PRODUCT INTELLIGENCE / LIVE CATALOGUE</p>
   <h1 style={{fontFamily:"Georgia,serif",fontWeight:400,fontSize:"clamp(44px,7vw,90px)",letterSpacing:"-.06em",lineHeight:1.05,maxWidth:950}}>Πραγματικά προϊόντα.<br/><em style={{color:"#557f68"}}>Χωρίς φανταστικές υποσχέσεις.</em></h1>
   <p style={{fontSize:18,maxWidth:750,lineHeight:1.7,color:"#52616d"}}>Εξερεύνησε καταχωρίσεις από τις διαθέσιμες πηγές. Οι εμφανιζόμενες τιμές είναι ενδεικτικές και δεν περιλαμβάνουν απαραίτητα μεταφορικά ή φόρους. Η διαφορά τιμής με την ελληνική αγορά και οι κριτικές δεν θεωρούνται επαληθευμένες χωρίς τεκμήρια.</p>
   <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:26}}>
    <span style={{border:"1px solid #ccd5cc",padding:"10px 14px",borderRadius:30}}>● {products.length} διαθέσιμες καταχωρίσεις στην προβολή</span>
    <span style={{border:"1px solid #ccd5cc",padding:"10px 14px",borderRadius:30}}>○ Επαλήθευση τελικού κόστους: ανά προϊόν</span>
   </div>
  </section>
  <section style={{maxWidth:1240,margin:"auto",padding:"25px 24px 100px"}}>
   {unavailable?<p role="status">Η πηγή προϊόντων δεν είναι προσωρινά διαθέσιμη. Δεν εμφανίζουμε κατασκευασμένα προϊόντα.</p>:
    products.length===0?<p role="status">Δεν υπάρχουν ακόμη διαθέσιμες καταχωρίσεις από την ενεργή πηγή.</p>:
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:18}}>
     {products.map((p,i)=>{const affiliate=validAffiliate(p.promotion_url);
      return <article key={p.product_candidate_id||p.source_product_id+"-"+i} style={{background:"#fff",border:"1px solid #d9ded8",borderRadius:16,overflow:"hidden",display:"flex",flexDirection:"column"}}>
       <div style={{height:230,display:"grid",placeItems:"center",background:"#eef0e9"}}>
        {p.image_url?<img src={p.image_url} alt={p.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"contain",padding:20}}/>:<span>Εικόνα μη διαθέσιμη</span>}
       </div>
       <div style={{padding:22,display:"flex",flexDirection:"column",gap:12,flex:1}}>
        <small style={{color:"#607c69",fontWeight:800,letterSpacing:1}}>{p.category||"PRODUCT DISCOVERY"}</small>
        <h2 style={{fontSize:19,lineHeight:1.3,margin:0}}>{compactTitle(p.title,88)}</h2>
        <p style={{color:"#687580",fontSize:13,margin:0}}>Αξιολογήσεις και σύγκριση ελληνικής αγοράς: απαιτούν επαλήθευση.</p>
        <strong style={{fontFamily:"Georgia,serif",fontSize:30,marginTop:"auto"}}>{p.price_eur!=null?money(p.price_eur):"Τιμή άγνωστη"}</strong>
        <Link href={"/eu/gr/product/"+encodeURIComponent(p.source_product_id)} style={{background:"#102037",color:"#fff",padding:"13px 16px",borderRadius:9,textAlign:"center",fontWeight:700}}>Δες τα στοιχεία ↗</Link>
        {affiliate?<a href={affiliate} target="_blank" rel="noopener noreferrer sponsored nofollow" style={{textAlign:"center",fontSize:12,color:"#315b48"}}>Άνοιγμα στο AliExpress (affiliate) ↗</a>:<small style={{color:"#a36b2a"}}>Affiliate link: δεν έχει επαληθευτεί στην πηγή προβολής</small>}
       </div>
      </article>})}
    </div>}
   <p style={{marginTop:28,fontSize:12,color:"#63717c"}}>Διαφάνεια: ενδέχεται να λαμβάνουμε προμήθεια από αγορές μέσω affiliate links, χωρίς επιπλέον χρέωση από εμάς.</p>
  </section>
 </main>
}
