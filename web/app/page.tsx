import Marketplace from "../components/Marketplace";
import {getMarketplaceData} from "../lib/products";

export const revalidate=300;

export default async function Page(){
  const data=await getMarketplaceData();
  return <>
    <header className="topNav discoveryNav">
      <a className="logo foundLogo" href="/">FOUND.<small>DISCOVERY COMMERCE</small></a>
      <nav><a href="#demand">Demand Atlas</a><a href="#market">Discover</a><a href="#proof">Why trust it</a></nav>
      <a className="navButton" href="#market">Discover solutions</a>
    </header>
    <Marketplace products={data.products} categories={data.categories} subcategories={data.subcategories} mode={data.mode}/>
  </>;
}
