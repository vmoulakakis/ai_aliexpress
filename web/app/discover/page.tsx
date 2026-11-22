import AgentExperience from "../../components/AgentExperience";
import {getMarketplaceData,type Product} from "../../lib/products";
export const revalidate=300;
export const metadata={title:"AXI | Your European discovery agent",description:"Describe what you need and investigate product options with country-aware context and transparent evidence."};
const supported=new Set(["GR","CY","DE","FR","IT","ES","NL","PL"]);
export default async function DiscoverPage({searchParams}:{searchParams:Promise<{country?:string;city?:string;problem?:string;lane?:string}>}){
 const q=await searchParams;
 const country=supported.has((q.country||"GR").toUpperCase())?(q.country||"GR").toUpperCase():"GR";
 let products:Product[]=[];
 try{products=(await getMarketplaceData()).products;}catch{/* fail closed */}
 return <AgentExperience products={products} initialCountry={country} initialCity={(q.city||"").slice(0,80)} initialPrompt={(q.problem||"").slice(0,700)} initialLane={q.lane||"pain"}/>;
}
