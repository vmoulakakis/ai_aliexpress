import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAxiData,
  price,
  problemName,
  safeAxiUrl,
} from "../../../../lib/axi";
import {
  FoundHeader,
  FoundFooter,
  Icon,
} from "../../../../components/found/FoundUI";
export const dynamic = "force-dynamic";
export const metadata = { title: "Μια πιθανή λύση, όλα τα στοιχεία | FOUND." };
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
      <div className="hx-app" lang="el">
        <FoundHeader active="product" />
        <main id="found-main" className="hx-unavailable">
          <Icon name="compass" size={40} />
          <h1>Τα στοιχεία δεν είναι διαθέσιμα.</h1>
          <p>Η πηγή δεν ανταποκρίνεται. Δοκίμασε ξανά αργότερα.</p>
          <Link className="hx-button hx-button-dark" href="/catalog">
            Πίσω στις λύσεις <Icon name="arrow" />
          </Link>
        </main>
        <FoundFooter />
      </div>
    );
  }
  const p = data.items[0];
  if (!p) notFound();
  const image = safeAxiUrl(p.image_url, "image"),
    affiliate = safeAxiUrl(p.affiliate_url, "affiliate");
  const primary = p.problem_keys?.[0];
  return (
    <div className="hx-app" lang="el">
      <FoundHeader active="product" />
      <main id="found-main" className="hx-container">
        <nav aria-label="Διαδρομή" className="hx-breadcrumb">
          <Link href="/catalog">Εξερεύνηση</Link>
          <Icon name="right" />
          {primary ? (
            <>
              <Link href={"/catalog?problem=" + primary}>
                {problemName(primary)}
              </Link>
              <Icon name="right" />
            </>
          ) : null}
          <span>Στοιχεία καταχώρισης</span>
        </nav>
        <section className="hx-detail-hero">
          <div className="hx-detail-media">
            <div className="hx-detail-photo">
              <span>PRODUCT / {id}</span>
              {image ? (
                <img
                  src={image}
                  alt={p.title}
                  width={600}
                  height={600}
                  fetchPriority="high"
                />
              ) : (
                <Icon name="source" size={55} />
              )}
            </div>
            <p>
              Εικόνα από την καταχώριση πωλητή. Η ταύτιση με το ακριβές SKU δεν
              έχει επαληθευτεί.
            </p>
          </div>
          <article className="hx-detail-copy">
            <span className="hx-detail-tag">
              <i />
              ΥΠΟΨΗΦΙΑ ΛΥΣΗ / ΠΡΟΣ ΕΛΕΓΧΟ
            </span>
            <h1>{p.user_job || p.title}</h1>
            <p className="hx-detail-mechanism">
              {p.mechanism ||
                "Η λειτουργία και η καταλληλότητα για τη χρήση σου χρειάζονται διερεύνηση."}
            </p>
            <div className="hx-detail-pricing">
              <strong>{price(p)}</strong>
              <span>
                Τιμή καταχώρισης
                <br />
                Detail API · EUR
              </span>
            </div>
            <p className="hx-detail-cost-note">
              Η τελική παραλλαγή, τα μεταφορικά, ο ΦΠΑ και το κόστος παράδοσης
              στην Ελλάδα χρειάζονται επιβεβαίωση στο AliExpress.
            </p>
            {affiliate ? (
              <a
                className="hx-button hx-button-dark"
                href={affiliate}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
              >
                Δες την καταχώριση στο AliExpress{" "}
                <Icon name="diagonal" size={19} />
              </a>
            ) : (
              <p>
                Δεν υπάρχει διαθέσιμος σύνδεσμος affiliate από την πηγή για αυτό
                το προϊόν.
              </p>
            )}
            <p className="hx-affiliate-note">
              Affiliate link: ενδέχεται να λάβουμε προμήθεια από αγορά, χωρίς
              επιπλέον χρέωση από εμάς. Tracking και απόδοση προμήθειας δεν
              έχουν επαληθευτεί.
            </p>
            <div className="hx-detail-context">
              <Icon name="compass" size={22} />
              <p>
                <strong>Πιθανός χρήστης</strong>
                <br />
                {p.persona || "Χρειάζεται περισσότερη διερεύνηση."}
              </p>
            </div>
            <div className="hx-detail-tags">
              {p.problem_keys?.map((k) => (
                <span key={k}>{problemName(k)}</span>
              ))}
            </div>
            <p className="hx-detail-original">Τίτλος πηγής: {p.title}</p>
          </article>
        </section>
        <section className="hx-detail-evidence">
          <div>
            <span className="hx-overline">
              <i />
              EVIDENCE BEFORE DECISION
            </span>
            <h2>
              Οι λεπτομέρειες
              <br />
              κάνουν τη διαφορά.
            </h2>
            <p>
              Τι υπάρχει στην πηγή, τι ερμηνεύει το AI και τι χρειάζεται ακόμη
              έλεγχο. Όλα στο ίδιο σημείο.
            </p>
          </div>
          <div className="hx-evidence-panel">
            <details open>
              <summary>
                Σε τι βασίζεται η ερμηνεία <Icon name="plus" size={18} />
              </summary>
              <div>
                {p.evidence_quote ? (
                  <blockquote>{p.evidence_quote}</blockquote>
                ) : (
                  <p>Δεν υπάρχει συνδεδεμένο απόσπασμα πηγής.</p>
                )}
                <p>
                  Πηγή: AliExpress catalog / detail API · Τεκμήριο{" "}
                  {p.source_document_id ?? "μη συνδεδεμένο"}
                </p>
                <p>
                  Καταγραφή:{" "}
                  {new Intl.DateTimeFormat("el-GR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Europe/Athens",
                  }).format(new Date(p.observed_at))}
                </p>
                <a
                  href={p.source_url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                >
                  Αρχική καταχώριση <Icon name="diagonal" size={14} />
                </a>
              </div>
            </details>
            <details open>
              <summary>
                Τι παραμένει προς έλεγχο <Icon name="plus" size={18} />
              </summary>
              <div>
                <ul>
                  <li>Ακριβές SKU και συμβατότητα με τη χρήση σου</li>
                  <li>Αποθήκη ΕΕ, παράδοση και τελικό κόστος Ελλάδας</li>
                  <li>
                    Πωλητής, αυθεντικότητα κριτικών, συμμόρφωση και εγγύηση
                  </li>
                  <li>Πραγματικά συγκρίσιμη εναλλακτική στην ελληνική αγορά</li>
                </ul>
                <p>
                  Δεν έχει αποδειχθεί σπανιότητα, εξοικονόμηση ή εμπορική
                  ευκαιρία.
                </p>
              </div>
            </details>
            <details>
              <summary>
                Πώς χρησιμοποιείται το AI <Icon name="plus" size={18} />
              </summary>
              <div>
                <p>
                  Η σύνδεση ανάγκης–προϊόντος προέρχεται από{" "}
                  {p.model || "εκκρεμή ταξινόμηση"}, έκδοση{" "}
                  {p.taxonomy_version || "μη διαθέσιμη"}. Παραμένει προς
                  ανθρώπινο έλεγχο. Η εμπιστοσύνη του μοντέλου δεν αποτελεί
                  αξιολόγηση ποιότητας ή σύσταση αγοράς.
                </p>
              </div>
            </details>
          </div>
        </section>
      </main>
      <FoundFooter />
    </div>
  );
}
