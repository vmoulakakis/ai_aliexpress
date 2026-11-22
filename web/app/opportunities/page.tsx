import Link from "next/link";
import "./opportunities.css";
import { getAxiData, PROBLEMS, problemName, type AxiData } from "../../lib/axi";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Χάρτης αναγκών | FOUND. AXI",
  description:
    "AI ερμηνεία πραγματικών προϊόντων ανά πρόβλημα, μηχανισμό και πιθανό χρήστη, με τεκμήρια και εκκρεμότητες.",
};
export default async function OpportunityMap() {
  let data: AxiData | null = null;
  try {
    data = await getAxiData("limit=1");
  } catch {}
  const clusters = data?.clusters || [];
  const max = Math.max(1, ...clusters.map((g) => g.products));
  const summary = data?.summary;
  return (
    <main className="omap">
      <header className="omap-nav">
        <Link href="/">
          FOUND<span>.</span>
        </Link>
        <nav>
          <Link href="/catalog">Υποψήφιες λύσεις</Link>
          <Link href="/discover">AXI Agent ↗</Link>
        </nav>
      </header>
      <section className="omap-hero">
        <p className="omap-kicker">FOUND. / AXI INTELLIGENCE / GREECE</p>
        <h1>
          Πρώτα η ανάγκη.
          <br />
          <em>Μετά η λύση.</em>
        </h1>
        <p>
          Τι προσπαθείς να πετύχεις; Το AI ερμηνεύει πραγματικές καταχωρίσεις
          και συνδέει το πρόβλημα με τον μηχανισμό που μπορεί να βοηθήσει. Κάθε
          σύνδεση κρατά την πηγή της και όσα απομένει να ελεγχθούν.
        </p>
        <Link className="omap-primary" href="#problem-map">
          Εξερεύνησε τον χάρτη αναγκών ↓
        </Link>
      </section>
      {summary ? (
        <section className="omap-stats" aria-label="Μετρήσεις AXI">
          <article>
            <span>01 / REAL CANDIDATES</span>
            <strong>{summary.products.toLocaleString("el-GR")}</strong>
            <p>Διακριτοί κωδικοί AliExpress στην AXI</p>
          </article>
          <article>
            <span>02 / AI INTERPRETATION</span>
            <strong>{summary.classified.toLocaleString("el-GR")}</strong>
            <p>Με αποθηκευμένη AI ερμηνεία και πηγή · προς έλεγχο</p>
          </article>
          <article>
            <span>03 / PRICE ≥ 50 €</span>
            <strong>{summary.eligible.toLocaleString("el-GR")}</strong>
            <p>Με ρητή τιμή EUR από το detail API · πριν τα μεταφορικά</p>
          </article>
          <article>
            <span>04 / VERIFIED DECISIONS</span>
            <strong>{summary.verified.toLocaleString("el-GR")}</strong>
            <p>Με καταγεγραμμένη απόφαση επαλήθευσης</p>
          </article>
        </section>
      ) : (
        <p className="axi-alert" role="status">
          Η πηγή AXI δεν είναι προσωρινά διαθέσιμη. Οι μετρήσεις δεν
          εμφανίζονται μέχρι να επιβεβαιωθούν.
        </p>
      )}
      <section className="omap-content" id="problem-map">
        <div className="omap-heading">
          <div>
            <p className="omap-kicker">THE PROBLEM LANDSCAPE</p>
            <h2>Τι θέλεις να αλλάξεις;</h2>
          </div>
          <p>
            Οι μπάρες μετρούν ταξινομημένους υποψηφίους, όχι ζήτηση ή πωλήσεις.
            Ένα προϊόν μπορεί να αφορά έως τρεις ανάγκες.
          </p>
        </div>
        <div className="omap-grid">
          <div className="omap-bars">
            {clusters.length ? (
              clusters.map((g, i) => (
                <article className="omap-bar" key={g.problem_key}>
                  <Link
                    className="omap-bar-top"
                    href={
                      "/catalog?problem=" + encodeURIComponent(g.problem_key)
                    }
                  >
                    <span>
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {problemName(g.problem_key)}
                    </span>
                    <strong>{g.products}</strong>
                  </Link>
                  <div className="omap-track" aria-hidden="true">
                    <div style={{ width: (g.products / max) * 100 + "%" }} />
                  </div>
                  <small>
                    {g.eligible} με τιμή ≥50 € ·{" "}
                    {PROBLEMS[g.problem_key]?.description}
                  </small>
                </article>
              ))
            ) : (
              <p role="status">
                Η ταξινόμηση δεν έχει ακόμη διαθέσιμα αποτελέσματα.
              </p>
            )}
          </div>
          <aside className="omap-aside">
            <span>HOW AXI CONNECTS THE DOTS</span>
            <h3>Ανάγκη → μηχανισμός → τεκμήριο → απόφαση</h3>
            {[
              [
                "01",
                "Τι χρειάζεσαι",
                "Το ζητούμενο είναι η εργασία που θέλεις να ολοκληρώσεις.",
              ],
              [
                "02",
                "Πώς μπορεί να βοηθήσει",
                "Το AI αναλύει τίτλο και στοιχεία πηγής. Ξεχωρίζει το εξάρτημα από την πλήρη μηχανή.",
              ],
              [
                "03",
                "Πού βασίζεται",
                "Κάθε ερμηνεία αποθηκεύει πραγματικό απόσπασμα, πηγή, μοντέλο και έκδοση.",
              ],
              [
                "04",
                "Τι μένει να μάθουμε",
                "Τελικό κόστος Ελλάδας, SKU, πωλητής, συμμόρφωση και τοπικές εναλλακτικές.",
              ],
            ].map(([n, t, d]) => (
              <div className="omap-step" key={n}>
                <b>{n}</b>
                <div>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>
      <section className="omap-bottom">
        <div>
          <p className="omap-kicker">FROM INTENT TO EVIDENCE</p>
          <h2>
            Διάλεξε την ανάγκη.
            <br />
            Εξέτασε τα στοιχεία.
          </h2>
        </div>
        <div className="omap-tiles">
          {clusters
            .filter((g) => g.problem_key !== "other")
            .slice(0, 6)
            .map((g) => (
              <article key={g.problem_key}>
                <span>AI PROBLEM CLUSTER · ΠΡΟΣ ΕΛΕΓΧΟ</span>
                <h3>{problemName(g.problem_key)}</h3>
                <p>{PROBLEMS[g.problem_key]?.description}</p>
                <p>
                  {g.products} υποψήφιοι · {g.eligible} με τιμή ≥50 €
                </p>
                <Link
                  href={"/catalog?problem=" + encodeURIComponent(g.problem_key)}
                >
                  Εξέτασε τις λύσεις ↗
                </Link>
              </article>
            ))}
        </div>
      </section>
      <footer className="omap-footer">
        FOUND. · Πηγή: AXI / AliExpress API ·{" "}
        {summary?.taxonomy_version || "Ταξινόμηση σε εκκρεμότητα"} · Οι
        ερμηνείες είναι υποθέσεις AI προς έλεγχο. Δεν έχει αποδειχθεί ελληνική
        ζήτηση, σπανιότητα ή εξοικονόμηση.{" "}
        {summary
          ? `${summary.affiliate_generated} κωδικοί με API-issued affiliate σύνδεσμο, χωρίς πλήρη επαλήθευση tracking/προμήθειας.`
          : ""}
      </footer>
    </main>
  );
}
