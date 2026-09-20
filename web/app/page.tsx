import Marketplace from "../components/Marketplace";
import {getMarketplaceData} from "../lib/products";

export const revalidate=300;

export default async function Page(){
  const data=await getMarketplaceData();
  return <>
    <header className="topNav">
      <a className="logo" href="/">ΑΞΙΖΕΙ;<small>PROOF-COMMERCE</small></a>
      <nav><a href="#demand">AI Demand</a><a href="#market">Marketplace</a><a href="#proof">Proof</a></nav>
      <a className="navButton" href="#market">Βρες λύση</a>
    </header>
    <Marketplace products={data.products} categories={data.categories} subcategories={data.subcategories} mode={data.mode}/>
  </>;
}
