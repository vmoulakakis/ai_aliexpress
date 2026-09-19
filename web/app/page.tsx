import Marketplace from "../components/Marketplace";
import {getProducts} from "../lib/products";

export const revalidate=300;

export default async function Page(){
  const products=await getProducts();
  return <>
    <header className="topNav">
      <a className="logo" href="/">ΑΞΙΖΕΙ;<small>PROOF-COMMERCE</small></a>
      <nav><a href="#market">Marketplace</a><a href="#proof">Proof</a><a href="#about">Πώς δουλεύει</a></nav>
      <a className="navButton" href="#market">Βρες λύση</a>
    </header>
    <Marketplace products={products}/>
  </>;
}
