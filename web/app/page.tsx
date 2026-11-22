import EuropeHome from "../components/EuropeHome";
import {getMarketplaceData,type Product} from "../lib/products";

export const revalidate=300;
export const metadata={title:"FOUND. EUROPE — Discover what you haven't found yet",description:"Discover hard-to-find solutions for your country. Tell AXI your problem and explore real product evidence across Europe."};
export default async function Page(){
 let products:Product[]=[];
 try{products=(await getMarketplaceData()).products;}catch{/* show honest empty state */}
 return <EuropeHome products={products}/>;
}
