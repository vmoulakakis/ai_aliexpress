"use client";
import {useMemo,useState} from "react";
import type {Product} from "../lib/products";
import {money,n} from "../lib/products";

export default function ProductDecision({product}:{product:Product}){
  const price=n(product.price_eur);
  const [annualPain,setAnnualPain]=useState(Math.max(Math.round(price*3),500));
  const [reduction,setReduction]=useState(35);
  const out=useMemo(()=>{
    const benefit=annualPain*reduction/100;
    const net=benefit-price;
    const payback=benefit>0?price/benefit*12:0;
    const breakEven=annualPain>0?price/annualPain*100:0;
    return {benefit,net,payback,breakEven};
  },[annualPain,reduction,price]);

  return <section className="roiLab">
    <div className="roiInputs">
      <p className="kicker">PERSONAL ECONOMIC PROOF</p>
      <h2>Βγάζει νόημα οικονομικά <em>για σένα;</em></h2>
      <p>Βάλε τη δική σου εκτίμηση κόστους. Το calculator δεν υπόσχεται εξοικονόμηση· δείχνει ποιο threshold πρέπει να περάσει η λύση.</p>
      <label>Ετήσιο κόστος / απώλεια από το πρόβλημα
        <div className="moneyInput">€<input type="number" min="0" value={annualPain} onChange={e=>setAnnualPain(+e.target.value)}/></div>
      </label>
      <label>Σενάριο μείωσης του προβλήματος
        <input type="range" min="0" max="100" value={reduction} onChange={e=>setReduction(+e.target.value)}/>
        <output>{reduction}%</output>
      </label>
    </div>
    <div className="roiOutput">
      <p className="scenario">ΣΕΝΑΡΙΟ — ΟΧΙ ΕΓΓΥΗΣΗ ΚΕΡΔΟΥΣ</p>
      <div className="heroNumber"><span>Πιθανό ετήσιο όφελος</span><strong>{money(out.benefit)}</strong></div>
      <div className="roiGrid">
        <div><span>Τιμή προϊόντος</span><b>{money(price)}</b></div>
        <div><span>Net πρώτο έτος</span><b className={out.net>=0?"positive":"negative"}>{money(out.net)}</b></div>
        <div><span>Scenario payback</span><b>{out.payback.toFixed(1)} μήνες</b></div>
        <div><span>Break-even threshold</span><b>{out.breakEven.toFixed(1)}%</b></div>
      </div>
      <p className="roiSentence">Για να καλύψει την τιμή του, πρέπει να αποτρέψει περίπου <strong>{out.breakEven.toFixed(1)}%</strong> του δικού σου ετήσιου κόστους προβλήματος.</p>
    </div>
  </section>
}
