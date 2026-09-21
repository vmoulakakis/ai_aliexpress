"use client";

import { useMemo, useState } from "react";
import styles from "./energy-payback.module.css";

const AFFILIATE_URL = "https://s.click.aliexpress.com/e/_c3HK3peh";

const SCENARIOS = [
  { id: "conservative", label: "Συντηρητικό", reduction: 0.06, note: "Χαμηλή παραδοχή για να δεις το downside." },
  { id: "balanced", label: "Βασικό", reduction: 0.12, note: "Μεσαίο σενάριο για σύγκριση και payback." },
  { id: "high", label: "Ισχυρό", reduction: 0.18, note: "Μόνο αν το πραγματικό προϊόν και το use case το υποστηρίζουν." }
] as const;

type ScenarioId = typeof SCENARIOS[number]["id"];

function euro(value: number, digits = 0) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: digits
  }).format(Number.isFinite(value) ? value : 0);
}

function fmt(value: number, digits = 0) {
  return new Intl.NumberFormat("el-GR", {
    maximumFractionDigits: digits
  }).format(Number.isFinite(value) ? value : 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function track(name: string, data: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("energy-payback:event", { detail: { name, ...data } }));
}

export default function EnergyPaybackPage() {
  const [bill, setBill] = useState(120);
  const [kwh, setKwh] = useState(450);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("balanced");
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [calculated, setCalculated] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);

  const selected = SCENARIOS.find((item) => item.id === scenarioId) || SCENARIOS[1];

  const result = useMemo(() => {
    const safeBill = Math.max(0, bill || 0);
    const safeKwh = Math.max(0, kwh || 0);
    const effectiveRate = safeKwh > 0 ? safeBill / safeKwh : 0;
    const variableShare = clamp(0.84 - Math.max(0, effectiveRate - 0.22) * 0.7, 0.58, 0.82);
    const consumptionLinkedCost = safeBill * variableShare;
    const monthlySavings = consumptionLinkedCost * selected.reduction;
    const annualSavings = monthlySavings * 12;
    const savedKwh = safeKwh * selected.reduction;
    const remainingKwh = Math.max(0, safeKwh - savedKwh);
    const paybackMonths = purchaseCost > 0 && monthlySavings > 0 ? purchaseCost / monthlySavings : null;
    return {
      effectiveRate,
      variableShare,
      consumptionLinkedCost,
      monthlySavings,
      annualSavings,
      savedKwh,
      remainingKwh,
      paybackMonths
    };
  }, [bill, kwh, selected, purchaseCost]);

  function calculate() {
    setCalculated(true);
    track("calculator_completed", {
      bill,
      kwh,
      scenario: scenarioId,
      annualSavings: Math.round(result.annualSavings)
    });
    requestAnimationFrame(() => {
      document.getElementById("energy-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main className={styles.site}>
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.nav}>
        <a className={styles.brand} href="/energy-payback">ENERGY<span>//</span>PAYBACK</a>
        <a
          className={styles.navCta}
          href={AFFILIATE_URL}
          target="_blank"
          rel="sponsored nofollow noopener"
          onClick={() => track("outbound_affiliate_click", { placement: "nav" })}
        >
          Δες προϊόν ↗
        </a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span className={styles.pulse} />GREECE · ENERGY COST INTELLIGENCE</div>
          <h1>Πόσα χρήματα<br/><em>φεύγουν από την πρίζα</em><br/>κάθε μήνα;</h1>
          <p>
            Δεν χρειάζεται να ξέρεις τιμολόγιο, πάροχο ή τιμή kWh.
            Βάλε μόνο <strong>τι πληρώνεις</strong> και <strong>πόσες kWh καίς</strong>.
            Το μοντέλο κάνει τα υπόλοιπα.
          </p>
        </div>

        <div className={styles.heroPanel} id="energy-calculator">
          <div className={styles.inputGroup}>
            <label htmlFor="bill">Λογαριασμός / μήνα</label>
            <div className={styles.bigInput}>
              <span>€</span>
              <input
                id="bill"
                type="number"
                min="1"
                value={bill}
                onChange={(e) => {
                  setBill(Number(e.target.value));
                  track("calculator_started");
                }}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="kwh">Κατανάλωση / μήνα</label>
            <div className={styles.bigInput}>
              <input id="kwh" type="number" min="1" value={kwh} onChange={(e) => setKwh(Number(e.target.value))} />
              <span>kWh</span>
            </div>
          </div>

          <button className={styles.primaryButton} onClick={calculate}>
            <span>Υπολόγισε το ενεργειακό σου κόστος</span><b>→</b>
          </button>
          <p className={styles.micro}>2 στοιχεία · κανένα signup · κανένα “μαγικό” ποσοστό</p>
        </div>

        <div className={styles.energyRail} aria-hidden="true">
          <i className={styles.energyDot} /><span>KWH</span><div className={styles.railLine} /><span>€</span>
        </div>
      </section>

      <section className={styles.truthStrip}>
        <div><span>01</span><p><strong>Δεν μειώνεται όλος ο λογαριασμός.</strong> Πάγια και μη μεταβλητές χρεώσεις δεν εξαφανίζονται όταν πέφτουν οι kWh.</p></div>
        <div><span>02</span><p><strong>Δεν δίνουμε ένα μόνο νούμερο.</strong> Βλέπεις συντηρητικό, βασικό και ισχυρό σενάριο.</p></div>
        <div><span>03</span><p><strong>Η απόσβεση έρχεται μετά.</strong> Πρώτα μετράς το pain. Μετά κρίνεις αν η αγορά έχει νόημα.</p></div>
      </section>

      <section className={styles.results} id="energy-results">
        <div className={styles.sectionLabel}>SMART SAVINGS ENGINE</div>
        <div className={styles.resultTop}>
          <div>
            <p className={styles.resultKicker}>MODELED ΕΤΗΣΙΟ ΠΕΡΙΘΩΡΙΟ</p>
            <div className={styles.heroNumber}>{calculated ? euro(result.annualSavings) : "—"}</div>
            <p className={styles.resultCopy}>
              Δεν είναι υπόσχεση εξοικονόμησης. Είναι το οικονομικό αποτέλεσμα του σεναρίου
              πάνω στο εκτιμώμενο consumption-linked μέρος του λογαριασμού.
            </p>
          </div>

          <div className={styles.metricsGrid}>
            <div><span>Effective κόστος</span><strong>{calculated ? euro(result.effectiveRate, 3) + "/kWh" : "—"}</strong></div>
            <div><span>Consumption-linked bill</span><strong>{calculated ? euro(result.consumptionLinkedCost) : "—"}</strong></div>
            <div><span>Modeled kWh reduction</span><strong>{calculated ? fmt(result.savedKwh) + " kWh" : "—"}</strong></div>
            <div><span>Modeled νέα κατανάλωση</span><strong>{calculated ? fmt(result.remainingKwh) + " kWh" : "—"}</strong></div>
          </div>
        </div>

        <div className={styles.scenarioBlock}>
          <div className={styles.scenarioHeader}>
            <div><span>SCENARIO MODEL</span><h2>Μην εμπιστεύεσαι ένα μόνο ποσοστό.</h2></div>
            <button className={styles.textButton} onClick={() => {
              setMethodOpen(!methodOpen);
              track("methodology_opened");
            }}>
              Πώς υπολογίζεται; {methodOpen ? "−" : "+"}
            </button>
          </div>

          <div className={styles.scenarioCards}>
            {SCENARIOS.map((scenario) => {
              const saving = result.consumptionLinkedCost * scenario.reduction;
              const cardClass = scenario.id === scenarioId
                ? styles.scenarioCard + " " + styles.activeScenario
                : styles.scenarioCard;
              return (
                <button
                  key={scenario.id}
                  className={cardClass}
                  onClick={() => {
                    setScenarioId(scenario.id);
                    track("scenario_changed", { scenario: scenario.id });
                  }}
                >
                  <div className={styles.scenarioName}><span>{scenario.label}</span><small>−{Math.round(scenario.reduction * 100)}% kWh</small></div>
                  <strong>{euro(saving)}</strong><em>/ μήνα</em>
                  <p>{scenario.note}</p>
                </button>
              );
            })}
          </div>

          {methodOpen && (
            <div className={styles.method}>
              <div><span>01</span><h3>Effective €/kWh</h3><p>Πραγματικός μηνιαίος λογαριασμός ÷ kWh της ίδιας περιόδου.</p></div>
              <div><span>02</span><h3>Variable-share estimator</h3><p>Το % δεν εφαρμόζεται σε όλο το bill. Εκτιμάται συντηρητικά το μέρος που συνδέεται με την κατανάλωση.</p></div>
              <div><span>03</span><h3>Scenario range</h3><p>Τρέχει εύρος 6%–18%. Η πραγματική επίδραση πρέπει να επιβεβαιωθεί από το ακριβές SKU και το use case.</p></div>
            </div>
          )}
        </div>
      </section>

      <section className={styles.flowSection}>
        <div className={styles.sectionLabel}>FROM BILL TO DECISION</div>
        <div className={styles.flowGrid}>
          <div className={styles.flowTitle}><h2>Ο λογαριασμός<br/>δεν είναι <em>ένα</em> κόστος.</h2></div>
          <div className={styles.billVisual}>
            <div className={styles.billHeader}><span>MONTHLY BILL</span><strong>{euro(bill)}</strong></div>
            <div className={styles.billBars}>
              <div className={styles.barVariable} style={{ width: String(result.variableShare * 100) + "%" }}><span>Consumption-linked</span></div>
              <div className={styles.barFixed} style={{ width: String((1 - result.variableShare) * 100) + "%" }}><span>Fixed / other</span></div>
            </div>
            <p>Γι’ αυτό ένα σοβαρό calculator δεν λέει απλώς “12% × λογαριασμός”.</p>
          </div>
        </div>
      </section>

      <section className={styles.agentSection}>
        <div className={styles.sectionLabel}>ENERGY AGENT TRACE</div>
        <div className={styles.agentGrid}>
          <div className={styles.agentIntro}>
            <h2>Από δύο inputs<br/>σε μία <em>απόφαση.</em></h2>
            <p>Το reasoning είναι ορατό. Δεν χρειάζεται να εμπιστευτείς ένα αδιαφανές “AI score”.</p>
          </div>
          <ol className={styles.trace}>
            <li><span>01</span><div><p>Διάβασα τον λογαριασμό</p><strong>{calculated ? euro(bill) : "—"}</strong></div></li>
            <li><span>02</span><div><p>Διάβασα την κατανάλωση</p><strong>{calculated ? fmt(kwh) + " kWh" : "—"}</strong></div></li>
            <li><span>03</span><div><p>Υπολόγισα effective cost</p><strong>{calculated ? euro(result.effectiveRate, 3) + "/kWh" : "—"}</strong></div></li>
            <li><span>04</span><div><p>Εκτίμησα consumption-linked bill</p><strong>{calculated ? euro(result.consumptionLinkedCost) : "—"}</strong></div></li>
            <li><span>05</span><div><p>Έτρεξα το {selected.label.toLowerCase()} σενάριο</p><strong>{calculated ? euro(result.monthlySavings) + "/μήνα" : "—"}</strong></div></li>
          </ol>
        </div>
      </section>

      <section className={styles.paybackSection}>
        <div className={styles.paybackCopy}>
          <div className={styles.sectionLabel}>BREAK-EVEN CLOCK</div>
          <h2>Η τιμή αγοράς έχει νόημα<br/>μόνο σε σχέση με την <em>απόσβεση.</em></h2>
          <p>
            Βάλε την τελική τιμή που βλέπεις στο AliExpress. Δεν την εφευρίσκουμε:
            μπορεί να αλλάζει ανά χώρα, κουπόνι, ΦΠΑ και μεταφορικά.
          </p>
        </div>

        <div className={styles.paybackCard}>
          <label htmlFor="purchase">Τελική τιμή αγοράς</label>
          <div className={styles.purchaseInput}><span>€</span><input id="purchase" type="number" min="0" placeholder="π.χ. 79" value={purchaseCost || ""} onChange={(e) => setPurchaseCost(Number(e.target.value))} /></div>
          <div className={styles.paybackResult}><span>ESTIMATED BREAK-EVEN</span><strong>{result.paybackMonths ? fmt(result.paybackMonths, 1) + " μήνες" : "Βάλε τιμή"}</strong></div>
          <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: result.paybackMonths ? String(clamp((12 / result.paybackMonths) * 100, 8, 100)) + "%" : "0%" }} /></div>
          <p className={styles.micro}>Η απόσβεση χρησιμοποιεί το επιλεγμένο scenario· δεν αποτελεί εγγύηση πραγματικής ενεργειακής απόδοσης.</p>
        </div>
      </section>

      <section className={styles.productSection}>
        <div className={styles.productOrb} aria-hidden="true"><div className={styles.productCore}>⚡</div><span className={styles.orbitOne} /><span className={styles.orbitTwo} /></div>
        <div className={styles.productCopy}>
          <div className={styles.sectionLabel}>PRODUCT DECISION</div>
          <h2>Τώρα έχεις το νούμερο.<br/><em>Τώρα</em> κοίτα το προϊόν.</h2>
          <p>Άνοιξε την πραγματική προσφορά, έλεγξε ακριβές SKU, τελική τιμή και τεχνικά χαρακτηριστικά. Μόνο τότε η modeled απόσβεση γίνεται αγοραστική απόφαση.</p>
          <div className={styles.productChecks}><span>✓ Έλεγξε ακριβές SKU</span><span>✓ Έλεγξε τελική τιμή / μεταφορικά</span><span>✓ Σύγκρινε βασικό και συντηρητικό scenario</span></div>
          <a className={styles.productCta} href={AFFILIATE_URL} target="_blank" rel="sponsored nofollow noopener" onClick={() => track("outbound_affiliate_click", { placement: "product" })}><span>Δες την πραγματική προσφορά στο AliExpress</span><b>↗</b></a>
          <small>Affiliate link: μπορεί να λάβουμε προμήθεια χωρίς επιπλέον κόστος για εσένα.</small>
        </div>
      </section>

      <section className={styles.final}>
        <span>NO HYPE · JUST THE NUMBER</span>
        <h2>Αν δεν βγαίνει η απόσβεση,<br/><em>μην το αγοράσεις.</em></h2>
        <button className={styles.finalButton} onClick={() => document.getElementById("energy-calculator")?.scrollIntoView({ behavior: "smooth" })}>Ξανακάνε τον υπολογισμό ↑</button>
      </section>

      <footer className={styles.footer}><div>ENERGY//PAYBACK</div><p>Scenario-based estimator. Δεν αποτελεί οικονομική ή τεχνική εγγύηση εξοικονόμησης.</p></footer>

      {calculated && (
        <a className={styles.mobileSticky} href={AFFILIATE_URL} target="_blank" rel="sponsored nofollow noopener" onClick={() => track("outbound_affiliate_click", { placement: "mobile_sticky" })}>
          <span>{euro(result.annualSavings)}/έτος modeled</span><b>Δες προσφορά ↗</b>
        </a>
      )}
    </main>
  );
}
