import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAxiData,
  price,
  problemName,
  safeAxiUrl,
} from "../../../../lib/axi";
import "../../../opportunities/opportunities.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Στοιχεία υποψήφιας λύσης | FOUND. AXI" };
export default async function AxiProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d{8,20}$/.test(id)) notFound();
  let data;
  try {
    data = await getAxiData("id=" + encodeURIComponent(id) + "&limit=1");
  } catch {
    return (
      <main className="omap">
        <div className="omap-content">
          <h1>Τα στοιχεία δεν είναι διαθέσιμα.</h1>
          <p role="status">
            Η πηγή δεν ανταποκρίνεται. Δοκίμασε ξανά αργότερα.
          </p>
          <Link href="/catalog">Επιστροφή στον κατάλογο</Link>
        </div>
      </main>
    );
  }
  const p = data.items[0];
  if (!p) notFound();
  const image = safeAxiUrl(p.image_url, "image"),
    affiliate = safeAxiUrl(p.affiliate_url, "affiliate");
  return (
    <main className="omap">
      <header className="omap-nav">
        <Link href="/opportunities">
          FOUND<span>.</span>
        </Link>
        <nav>
          <Link href="/catalog">Κατάλογος</Link>
          <Link href="/opportunities">Χάρτης αναγκών</Link>
        </nav>
      </header>
      <section className="omap-content">
        <p className="omap-kicker">AXI / PRODUCT EVIDENCE / {id}</p>
        <div className="axi-detail">
          <div className="axi-photo">
            {image ? (
              <img src={image} alt={p.title} />
            ) : (
              <span>Δεν υπάρχει διαθέσιμη εικόνα πηγής</span>
            )}
          </div>
          <article>
            <p className="axi-label">ΥΠΟΨΗΦΙΑ ΛΥΣΗ · ΕΛΕΓΧΟΣ ΣΕ ΕΞΕΛΙΞΗ</p>
            <h1 className="axi-title">{p.user_job || p.title}</h1>
            <p>{p.title}</p>
            <strong className="axi-price">{price(p)}</strong>
            <p className="axi-note">
              Τιμή καταχώρισης του detail API σε EUR. Η παραλλαγή, τα
              μεταφορικά, ο ΦΠΑ και το τελικό κόστος Ελλάδας χρειάζονται
              επιβεβαίωση στο AliExpress.
            </p>
            {affiliate ? (
              <a
                className="omap-primary"
                href={affiliate}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
              >
                Δες την καταχώριση στο AliExpress ↗
              </a>
            ) : (
              <p>
                Δεν υπάρχει σύνδεσμος affiliate από το API για αυτό το προϊόν.
              </p>
            )}
            <p className="axi-note">
              Affiliate: ενδέχεται να λάβουμε προμήθεια από αγορά μέσω του
              συνδέσμου, χωρίς επιπλέον χρέωση από εμάς. Η απόδοση προμήθειας
              δεν έχει επαληθευτεί.
            </p>
          </article>
        </div>
        <div className="axi-ledger">
          <article>
            <p className="omap-kicker">01 / AI INTERPRETATION</p>
            <h2>Πώς μπορεί να βοηθήσει</h2>
            <p>{p.mechanism || "Δεν υπάρχει ακόμη ερμηνεία AI."}</p>
            <p>Πιθανός χρήστης: {p.persona || "Προς διερεύνηση"}</p>
            {p.problem_keys?.map((k) => (
              <span className="axi-tag" key={k}>
                {problemName(k)}
              </span>
            ))}
            <p className="axi-note">
              Ερμηνεία {p.model || "σε εκκρεμότητα"} ·{" "}
              {p.taxonomy_version || "χωρίς ταξινόμηση"} · προς ανθρώπινο
              έλεγχο. Η εμπιστοσύνη του μοντέλου δεν αποτελεί αξιολόγηση
              ποιότητας προϊόντος.
            </p>
          </article>
          <article>
            <p className="omap-kicker">02 / SOURCE EVIDENCE</p>
            <h2>Σε τι βασίζεται</h2>
            {p.evidence_quote ? (
              <blockquote>{p.evidence_quote}</blockquote>
            ) : (
              <p>Δεν υπάρχει δεσμευμένο απόσπασμα.</p>
            )}
            <p>Πηγή: AliExpress catalog / detail API</p>
            <p className="axi-note">
              Καταγραφή:{" "}
              {new Intl.DateTimeFormat("el-GR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Europe/Athens",
              }).format(new Date(p.observed_at))}{" "}
              · τεκμήριο {p.source_document_id ?? "μη συνδεδεμένο"}
            </p>
            <a
              href={p.source_url}
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              Αρχική καταχώριση ↗
            </a>
          </article>
          <article>
            <p className="omap-kicker">03 / STILL UNKNOWN</p>
            <h2>Πριν αποφασίσεις</h2>
            <ul>
              <li>Ακριβές SKU και συμβατότητα με τη χρήση σου</li>
              <li>Αποθήκη ΕΕ, παράδοση και τελικό κόστος Ελλάδας</li>
              <li>Αξιοπιστία πωλητή και αυθεντικότητα κριτικών</li>
              <li>Συμμόρφωση, εγγύηση και επιστροφές</li>
              <li>Πραγματική σύγκριση με ελληνικό κατάστημα</li>
            </ul>
            <p className="axi-note">
              Δεν έχει αποδειχθεί σπανιότητα, εξοικονόμηση ή εμπορική ευκαιρία.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
