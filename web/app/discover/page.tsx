import AgentExperience from "../../components/AgentExperience";
import {getMarketplaceData,type Product} from "../../lib/products";

export const revalidate=300;
export const metadata={title:"FOUND. | AI problem-solving discovery",description:"Describe your problem. Explore evidence-backed AliExpress solutions for Greece with a conversational AI consultant."};
export default async function DiscoverPage(){
 let products:Product[]=[];
 try{const response=await getMarketplaceData();products=response.products;}catch{ /* fail closed */ }
 return <AgentExperience products={products}/>;
}
