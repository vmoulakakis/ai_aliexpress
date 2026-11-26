import EuropeHome from "../components/EuropeHome";
import {getMarketplaceData,type Product} from "../lib/products";

export const revalidate=300;
export const metadata={title:"FOUND. EUROPE — Discover what you haven't found yet",description:"Discover hard-to-find solutions for your country. Tell AXI your problem and explore real product evidence across Europe."};
export default async function Page(){
 let products:Product[]=[];
 let catalogueError=false;
 try{products=(await getMarketplaceData()).products;}
 catch(error){catalogueError=true;console.error("FOUND catalogue unavailable:",error instanceof Error?error.message:"unknown error");}
 return <>
  {catalogueError&&<div role="alert" style={{padding:"12px 20px",background:"#fff2dc",color:"#49300b",fontSize:14}}>Ο κατάλογος προϊόντων δεν φορτώθηκε προσωρινά. Δεν σημαίνει ότι δεν υπάρχουν προϊόντα. Δοκιμάστε ανανέωση της σελίδας. / Product catalogue temporarily unavailable — please refresh.</div>}
  <EuropeHome products={products}/>
 </>;
}
