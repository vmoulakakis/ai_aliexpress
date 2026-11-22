import AgentExperience from "../../components/AgentExperience";
import {getMarketplaceData,type Product} from "../../lib/products";
export const revalidate=300;
export const metadata={title:"AXI | Your European discovery agent",description:"Describe what you need and investigate product options with country-aware context and transparent evidence."};
const supported=new Set(["GR","CY","DE","FR","IT","ES","NL","PL","AT","BE","BG","HR","CZ","DK","EE","FI","HU","IE","LV","LT","LU","MT","PT","RO","SK","SI","SE"]);
export default async function DiscoverPage({searchParams}:{searchParams:Promise<{country?:string;city?:string;problem?:string;lane?:string;lang?:string}>}){
 const q=await searchParams;
 const country=supported.has((q.country||"GR").toUpperCase())?(q.country||"GR").toUpperCase():"GR";
 let products:Product[]=[];
 try{products=(await getMarketplaceData()).products;}catch{/* fail closed */}
 const lang=["el","en","de","fr"].includes(q.lang||"")?(q.lang as string):(["GR","CY"].includes(country)?"el":["DE","AT"].includes(country)?"de":["FR","BE","LU"].includes(country)?"fr":"en");
 let opportunities=[];
 try {
  const r=await fetch("https://gqpbskssrvpfjtujwezc.supabase.co/functions/v1/found-europe-opportunities?country="+country,{next:{revalidate:300}});
  if(r.ok){const data=await r.json();opportunities=Array.isArray(data.offers)?data.offers:[];}
 }catch{/* unavailable evidence must not be fabricated */}
 return <AgentExperience products={products} opportunities={opportunities} initialLocale={lang} initialCountry={country} initialCity={(q.city||"").slice(0,80)} initialPrompt={(q.problem||"").slice(0,700)} initialLane={q.lane||"pain"}/>;
}
