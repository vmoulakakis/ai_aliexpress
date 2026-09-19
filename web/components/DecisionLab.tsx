"use client";

import { useMemo, useState } from "react";

type ProofState = "Strong" | "Partial" | "Missing";

const proofRows: Array<[string, ProofState, string]> = [
  ["Pain relevance", "Strong", "Το προϊόν αντιστοιχεί άμεσα στο επαγγελματικό pain."],
  ["Greek market gap", "Strong", "Specialist αγορά και όχι μαζικά commoditized listings."],
  ["Product mechanism", "Strong", "Acoustic imaging για localization διαρροών."],
  ["Price evidence", "Strong", "Live listing price διαθέσιμη."],
  ["Seller evidence", "Partial", "Υπάρχει shop/listing evidence, όχι πλήρης εμπορικός έλεγχος."],
  ["Fulfillment", "Partial", "Δεν έχει επιβεβαιωθεί πλήρως landed cost / service."],
  ["Review evidence", "Missing", "Δεν υπάρχει verified written review corpus."],
  ["Warranty / calibration", "Missing", "Δεν έχει επιβεβαιωθεί."],
];

function Money({ value }: { value: number }) {
  return <>{new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value)}</>;
}

export default function DecisionLab() {
  const [stock, setStock] = useState(3500);
  const [riskPct, setRiskPct] = useState(60);
  const [incidents, setIncidents] = useState(1.5);
  const [reduction, setReduction] = useState(70);
  const [solutionPrice, setSolutionPrice] = useState(170);
  const [open, setOpen] = useState<number | null>(0);

  const calc = useMemo(() => {
    const annualExposure = stock * (riskPct / 100) * incidents;
    const scenarioAvoided = annualExposure * (reduction / 100);
    const decisionGap = scenarioAvoided - solutionPrice;
    const threshold = annualExposure > 0 ? (solutionPrice / annualExposure) * 100 : 0;
    return { annualExposure, scenarioAvoided, decisionGap, threshold };
  }, [stock, riskPct, incidents, reduction, solutionPrice]);

  return (
    <main>
      <header className="nav">
        <a className="brand" href="#top"><span>ΑΞΙΖΕΙ;</span><small>Proof-Commerce Engine</small></a>
        <nav><a href="#proof">Απόδειξη</a><a href="#calculator">Calculator</a><a href="#passport">Proof Passport</a></nav>
        <a className="navCta" href="#calculator">Έλεγξε αν αξίζει</a>
      </header>

      <section className="hero section" id="top">
        <div className="heroCopy">
          <p className="eyebrow">EVIDENCE → ECONOMICS → DECISION → PRODUCT</p>
          <h1>Αξίζει να αγοράσεις <em>τη λύση;</em></h1>
          <h2>Απόδειξέ το πριν πληρώσεις.</h2>
          <p className="lede">Περιέγραψε τι σου κοστίζει το πρόβλημα. Ελέγχουμε το pain, την ελληνική αγορά, το product fit και τα οικονομικά — και ξεχωρίζουμε τι είναι επιβεβαιωμένο, τι είναι σενάριο και τι λείπει ακόμα.</p>
          <div className="heroActions"><a className="primary" href="#calculator">Υπολόγισε αν αξίζει</a><a className="textLink" href="#proof">Δες τη μεθοδολογία →</a></div>
        </div>
        <aside className="decisionConsole">
          <div className="consoleTop"><span>LIVE DECISION CASE</span><span className="dot"></span></div>
          <p className="consoleLabel">Πρόβλημα</p>
          <h3>Βλάβη καταψύκτη εκτός ωραρίου</h3>
          <div className="bigMetric"><span>Estimated exposure</span><strong><Money value={3150} /></strong><small>/ έτος</small></div>
          <div className="signalGrid">
            <div><span>Greek supply</span><b className="partial">PARTIAL</b></div>
            <div><span>Buyer intent</span><b className="strong">HIGH</b></div>
            <div><span>Evidence</span><b>7 signals</b></div>
            <div><span>Missing</span><b className="missing">Reviews</b></div>
          </div>
          <div className="consoleFoot"><span>AI match</span><b>Remote cold-chain monitor</b></div>
        </aside>
      </section>

      <section className="trustRail" id="proof">
        {["ΠΡΟΒΛΗΜΑ","ΚΟΣΤΟΣ","ΑΠΟΔΕΙΞΗ","ΛΥΣΗ","ΣΥΓΚΡΙΣΗ","ΑΠΟΦΑΣΗ"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><b>{x}</b></div>)}
      </section>

      <section className="section calculatorSection" id="calculator">
        <div className="sectionIntro">
          <p className="eyebrow">SIGNATURE DECISION TOOL</p>
          <h2>Πόσο σου κοστίζει να μην κάνεις τίποτα;</h2>
          <p>Δεν ξεκινάμε από την τιμή του προϊόντος. Ξεκινάμε από την οικονομική έκθεση του προβλήματος.</p>
        </div>
        <div className="calculator">
          <div className="controls">
            <label>Αξία αποθέματος <input type="number" value={stock} onChange={e=>setStock(+e.target.value)} /></label>
            <label>Ποσοστό σε κίνδυνο <input type="range" min="0" max="100" value={riskPct} onChange={e=>setRiskPct(+e.target.value)} /><output>{riskPct}%</output></label>
            <label>Περιστατικά / έτος <input type="number" step="0.1" value={incidents} onChange={e=>setIncidents(+e.target.value)} /></label>
            <label>Υπόθεση μείωσης κινδύνου <input type="range" min="0" max="100" value={reduction} onChange={e=>setReduction(+e.target.value)} /><output>{reduction}%</output></label>
            <label>Κόστος λύσης <input type="number" value={solutionPrice} onChange={e=>setSolutionPrice(+e.target.value)} /></label>
          </div>
          <div className="results">
            <p className="scenario">ΣΕΝΑΡΙΟ — ΟΧΙ ΕΓΓΥΗΜΕΝΗ ΕΞΟΙΚΟΝΟΜΗΣΗ</p>
            <div className="resultBig"><span>Ετήσιο exposure</span><strong><Money value={calc.annualExposure} /></strong></div>
            <div className="resultPair"><div><span>Scenario avoided loss</span><b><Money value={calc.scenarioAvoided} /></b></div><div><span>Decision gap</span><b><Money value={calc.decisionGap} /></b></div></div>
            <p className="decisionSentence">Η λύση πρέπει να προστατεύσει μόλις <strong>{calc.threshold.toFixed(1)}%</strong> του εκτιμώμενου annual exposure για να καλύψει την τιμή της.</p>
          </div>
        </div>
      </section>

      <section className="section passportSection" id="passport">
        <div className="passportHead">
          <div><p className="eyebrow">PRODUCT PROOF PASSPORT</p><h2>FOTRIC TD2e</h2><p>Acoustic Imaging Camera · Διαρροές πεπιεσμένου αέρα</p></div>
          <div className="passportPrice"><span>Live listing</span><strong>€965</strong></div>
        </div>
        <div className="passport">
          {proofRows.map(([label,state,explain],i)=>(
            <button key={label} className="proofRow" onClick={()=>setOpen(open===i?null:i)} aria-expanded={open===i}>
              <div><span>{label}</span><b className={state.toLowerCase()}>{state}</b></div>
              {open===i && <p>{explain}</p>}
            </button>
          ))}
        </div>
      </section>

      <section className="section counterEvidence">
        <div>
          <p className="eyebrow">COUNTER-EVIDENCE</p>
          <h2>Τι θα μπορούσε να αλλάξει αυτή την πρόταση;</h2>
        </div>
        <ol>
          <li><span>01</span>Ίδια verified specs φθηνότερα στην Ελλάδα.</li>
          <li><span>02</span>Καλύτερο local warranty / calibration / service.</li>
          <li><span>03</span>Το δικό σου ετήσιο pain cost είναι πολύ χαμηλότερο.</li>
          <li><span>04</span>Η έλλειψη warranty evidence αποδειχθεί κρίσιμη για τη χρήση σου.</li>
        </ol>
      </section>

      <section className="section twoCol">
        <article className="dontBuy">
          <p className="eyebrow">DISQUALIFIER</p>
          <h2>Πότε <em>ΔΕΝ</em> αξίζει να το αγοράσεις</h2>
          <ul><li>Αν η ελληνική εναλλακτική έχει ίδια απόδοση, χαμηλότερο landed cost και καλύτερο service.</li><li>Αν το pain εμφανίζεται τόσο σπάνια ώστε η απόσβεση να μην βγαίνει.</li><li>Αν λείπει evidence που είναι κρίσιμο για ασφάλεια, συμμόρφωση ή αξιοπιστία.</li></ul>
        </article>
        <article className="ledger">
          <p className="eyebrow">EVIDENCE LEDGER</p>
          <h2>Τι ξέρουμε / τι όχι</h2>
          <div className="ledgerCols"><div><b>Επιβεβαιωμένο</b><p>Live price</p><p>Seller/shop ID</p><p>Observed sales</p><p>Main image</p><p>Greek gap assessment</p></div><div><b>Λείπει evidence</b><p>Written review corpus</p><p>Full SKU matrix</p><p>Verified warranty</p><p>Long-term reliability</p></div></div>
        </article>
      </section>

      <section className="section systemProof">
        <p className="eyebrow">SYSTEM DATA — ΟΧΙ TESTIMONIALS</p>
        <div className="stats"><div><strong>41</strong><span>Greek pain clusters</span></div><div><strong>87</strong><span>eligible offers</span></div><div><strong>87</strong><span>product intelligence profiles</span></div><div><strong>1.131</strong><span>verified listing facts</span></div></div>
      </section>

      <section className="finalCta">
        <p>Δεν ξεκινάμε από προϊόν.</p>
        <h2>Ξεκινάμε από το κόστος του προβλήματος.</h2>
        <a href="#calculator">Πριν πληρώσεις, μάθε αν αξίζει →</a>
      </section>

      <footer>Ορισμένοι σύνδεσμοι μπορεί να είναι affiliate. Η κατάταξη δεν αγοράζεται και η προμήθεια δεν αλλάζει το κόστος για εσένα.</footer>
    </main>
  );
}
