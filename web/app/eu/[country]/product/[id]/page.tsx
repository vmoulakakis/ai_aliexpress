import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {getProduct,money} from "../../../../../lib/products";
import "./EuropeProduct.css";
const countries:Record<string,{name:string;language:string;locale:string}>={
 gr:{name:"Greece",language:"Ελληνικά",locale:"el-GR"},cy:{name:"Cyprus",language:"Ελληνικά",locale:"el-CY"},
 de:{name:"Germany",language:"Deutsch",locale:"de-DE"},fr:{name:"France",language:"Français",locale:"fr-FR"},
 it:{name:"Italy",language:"Italiano",locale:"it-IT"},es:{name:"Spain",language:"Español",locale:"es-ES"},
 nl:{name:"Netherlands",language:"English",locale:"en-NL"},pl:{name:"Poland",language:"English",locale:"en-PL"},
 at:{name:"Austria",language:"Deutsch",locale:"de-AT"},be:{name:"Belgium",language:"Français / English",locale:"fr-BE"},bg:{name:"Bulgaria",language:"English",locale:"en-BG"},hr:{name:"Croatia",language:"English",locale:"en-HR"},cz:{name:"Czechia",language:"English",locale:"en-CZ"},dk:{name:"Denmark",language:"English",locale:"en-DK"},ee:{name:"Estonia",language:"English",locale:"en-EE"},fi:{name:"Finland",language:"English",locale:"en-FI"},hu:{name:"Hungary",language:"English",locale:"en-HU"},ie:{name:"Ireland",language:"English",locale:"en-IE"},lv:{name:"Latvia",language:"English",locale:"en-LV"},lt:{name:"Lithuania",language:"English",locale:"en-LT"},lu:{name:"Luxembourg",language:"Français",locale:"fr-LU"},mt:{name:"Malta",language:"English",locale:"en-MT"},pt:{name:"Portugal",language:"English",locale:"en-PT"},ro:{name:"Romania",language:"English",locale:"en-RO"},sk:{name:"Slovakia",language:"English",locale:"en-SK"},si:{name:"Slovenia",language:"English",locale:"en-SI"},se:{name:"Sweden",language:"English",locale:"en-SE"}};
type Params={country:string;id:string};
export const revalidate=300;
export async function generateMetadata({params}:{params:Promise<Params>}):Promise<Metadata>{
 const {country,id}=await params;if(!countries[country])return {};
 const p=await getProduct(id);if(!p)return {};
 return {title:p.title.slice(0,90)+" | FOUND. "+countries[country].name,
 description:"Investigate "+p.title.slice(0,95)+" for "+countries[country].name+". See use cases, product facts, market verification status and source listing.",
 robots:{index:false,follow:true},alternates:{canonical:"/eu/"+country+"/product/"+encodeURIComponent(id)}};
}
export default async function EuropeProductPage({params}:{params:Promise<Params>}){
 const {country,id}=await params,market=countries[country];
 if(!market||!id||id.length>150)notFound();
 const p=await getProduct(id);if(!p||!p.source_product_id)notFound();
 const affiliate=p.promotion_url||p.product_url;const hasAffiliate=!!p.promotion_url;
 const shipping=p.fulfillment_analysis?.status;
 const why=Array.isArray(p.pros)?p.pros.slice(0,3).map(x=>typeof x==="string"?x:x?.pro).filter(Boolean):[];
 const caution=Array.isArray(p.evidence_gaps)?p.evidence_gaps.slice(0,5).map(x=>String(x).replaceAll("_"," ")):[];

 return <main className="ep">
  <header className="ep-nav"><Link href="/" className="ep-logo">FOUND<span>.</span></Link><div className="ep-nav-right"><span>{market.name} · {market.language}</span><Link href="/discover">Ask AXI ↗</Link></div></header>
  <section className="ep-hero"><div className="ep-art">
   <div className="ep-art-halo"/>{p.image_url?<img src={p.image_url} alt={p.title} className="ep-main-image"/>:<div className="ep-no-image">PRODUCT VISUAL PENDING</div>}
   <div className="ep-floating ep-one">PRODUCT / INTELLIGENCE</div><div className="ep-floating ep-two">MARKET · {country.toUpperCase()}</div>
  </div><div className="ep-story"><div className="ep-kicker">FOUND. / SOLUTION DISCOVERY / {market.name.toUpperCase()}</div>
   <p className="ep-super">A better way to solve a problem.</p>
   <h1>{p.problem_title||"An unexpected solution worth exploring."}</h1>
   <p className="ep-intro">Explore whether this specialist product fits your needs. Our current listing does not prove it is unavailable elsewhere in Europe.</p>
   <h2>{p.title}</h2>
   <div className="ep-pricing"><strong>{p.price_eur!=null?money(p.price_eur):"Price unavailable"}</strong><small>Observed catalogue price · not confirmed landed cost</small></div>
   <div className="ep-cta-row">
    {affiliate?<a href={affiliate} target="_blank" rel="nofollow sponsored noopener noreferrer" className="ep-buy">{hasAffiliate?"View AliExpress offer ↗":"View source listing ↗"}</a>:<span className="ep-disabled">Source offer not available</span>}
    <Link href={"/discover?country="+country.toUpperCase()+"&problem="+encodeURIComponent(p.problem_title||p.title)} className="ep-ask">Ask AXI about this ↗</Link>
   </div>
   <p className="ep-affiliate">We may earn a commission on qualifying purchases. Verify current shipping, price, taxes, return terms and compatibility with the seller.</p>
  </div></section>
  <section className="ep-evidence"><div className="ep-heading"><span>01 / MARKET REALITY</span><h2>Rare in Europe?<em> Verify before claiming.</em></h2><p>This product is a candidate for local market analysis, not an established European exclusive.</p></div><div className="ep-evidence-grid">
   <div><span>MARKET PRESENCE</span><strong>Not verified</strong><p>Exact and functionally equivalent offers across European marketplaces and e-shops have not been exhaustively checked.</p></div>
   <div><span>SHIPPING TO {market.name.toUpperCase()}</span><strong>Not verified</strong><p>{shipping?"Existing supplier fulfillment snapshot: "+String(shipping)+".":"Destination-specific delivery remains unverified."} Check destination, final cost and delivery options.</p></div>
   <div><span>PRODUCT COMPLIANCE</span><strong>Not verified</strong><p>EU product safety, CE applicability, product-specific obligations and responsible operator have not been verified for this listing.</p></div>
   <div><span>AFFILIATE COMMISSION</span><strong>Not verified</strong><p>No public guarantee of €10+ commission or eligibility. The exact rate must be confirmed through a signed affiliate record.</p></div>
  </div></section>
  <section className="ep-details"><div className="ep-heading"><span>02 / SOLUTION REPORT</span><h2>What matters.<em> What remains unknown.</em></h2></div><div className="ep-columns"><article><h3>The job to be done</h3><p>{p.problem_title||"Check the specific need and technical use case before buying."}</p><p>{p.target_customer?"Intended audience: "+p.target_customer:"Target users need further verification."}</p><h3>Why investigate it?</h3>{why.length?<ul>{why.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>Use-case suitability and advantages have not been sufficiently documented.</p>}</article>
  <article className="ep-unknown"><h3>Questions to resolve before purchase</h3>{caution.length?<ul>{caution.map((x,i)=><li key={i}>{x}</li>)}</ul>:<ul><li>Exact specifications and compatible variants</li><li>Actual seller warranty and return policy</li><li>Delivery to the selected country</li><li>European product-safety evidence</li></ul>}<p>Do not confuse absence from a limited search with confirmed exclusivity across Europe.</p></article></div></section>
  <section className="ep-next"><span>03 / LET'S SOLVE YOUR PROBLEM</span><h2>Not sure this is the right one?</h2><p>Tell AXI how you intend to use it. Compare alternatives and identify the missing evidence.</p><Link href={"/discover?country="+country.toUpperCase()+"&problem="+encodeURIComponent("I want to compare "+p.title+" for my use case in "+market.name)} className="ep-buy">Investigate with AXI ↗</Link></section>
  <footer className="ep-footer"><Link href="/">FOUND. EUROPE</Link><span>Evidence-led recommendations · Affiliate disclosure · Local market verification pending</span></footer>
 </main>;
}
