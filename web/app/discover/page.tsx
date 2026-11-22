import DiscoveryChannels from "../../components/DiscoveryChannels";
import {getMarketplaceData} from "../../lib/products";

export const revalidate=300;
export const metadata={title:"AI Gap Hunter | Premium · Pain Gaps · Emerging",description:"Discover AI-sourced AliExpress solutions for Greece with transparent product and affiliate verification."};

export default async function DiscoverPage(){
  let data={products:[] as Awaited<ReturnType<typeof getMarketplaceData>>["products"],mode:"UNAVAILABLE"};
  try {const response=await getMarketplaceData();data={products:response.products,mode:response.mode};}
  catch { /* fail closed: no invented inventory */ }
  return <DiscoveryChannels products={data.products} mode={data.mode}/>;
}
