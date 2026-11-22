import Link from "next/link";
import {
  getAxiData,
  price,
  problemName,
  safeAxiUrl,
  type AxiData,
} from "../../lib/axi";
import "../opportunities/opportunities.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Υποψήφιες λύσεις | FOUND. AXI",
  description:
    "Προϊόντα του AXI με τιμές EUR από την πηγή και τεκμηριωμένη AI ερμηνεία.",
};
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; problem?: string }>;
}) {
  const s = await searchParams;
  const query = new URLSearchParams({ limit: "36" });
  if (s.after && /^\d{1,12}$/.test(s.after)) query.set("after", s.after);
  if (s.problem && /^[a-z-]{1,50}$/.test(s.problem))
    query.set("problem", s.problem);
  let data: AxiData | null = null;
  try {
    data = await getAxiData(query.toString());
  } catch {}
  return (
    <main className="omap">
      <header className="omap-nav">
        <Link href="/opportunities">
          FOUND<span>.</span>
        </Link>
        <nav>
          <Link href="/opportunities">Χάρτης αναγκών</Link>
          <Link href="/discover">AXI Agent ↗</Link>
        </nav>
      </header>
      <section className="omap-content">
        <p className="omap-kicker">AXI / CANDIDATE SOLUTIONS</p>
        <h1 className="axi-title">
          {s.problem
            ? problemName(s.problem)
            : "Από την ανάγκη στην υποψήφια λύση."}
        </h1>
        <p className="axi-intro">
          {data
            ? `${data.summary.products.toLocaleString("el-GR")} πραγματικοί κωδικοί στην πηγή · ${data.summary.eligible.toLocaleString("el-GR")} με καταγεγραμμένη τιμή EUR ≥50 €.`
            : "Η πηγή δεν είναι διαθέσιμη."}{" "}
          Οι κάρτες παρουσιάζουν υποψηφίους για έρευνα. Ταξινόμηση AI δεν
          σημαίνει επαληθευμένη σύσταση αγοράς.
        </p>
        <p className="axi-note">
          Τιμές καταχώρισης, χωρίς επιβεβαίωση τελικού κόστους Ελλάδας. Οι
          καταχωρίσεις κάτω από 50 € παραμένουν ορατές ως ευρήματα προς έλεγχο.
        </p>
        {!data ? (
          <p role="status">
            Προσωρινή αδυναμία σύνδεσης. Δεν εμφανίζονται υποθετικά προϊόντα.
          </p>
        ) : data.items.length === 0 ? (
          <p role="status">
            Δεν υπάρχουν καταχωρίσεις σε αυτή την προβολή.{" "}
            <Link href="/catalog">Όλες οι υποψήφιες λύσεις ↗</Link>
          </p>
        ) : (
          <>
            <div className="axi-cards">
              {data.items.map((p) => {
                const image = safeAxiUrl(p.image_url, "image");
                return (
                  <article className="axi-card" key={p.id}>
                    <Link
                      href={"/axi/product/" + p.aliexpress_product_id}
                      className="axi-card-image"
                    >
                      {image ? (
                        <img src={image} alt={p.title} loading="lazy" />
                      ) : (
                        <span>Εικόνα μη διαθέσιμη</span>
                      )}
                    </Link>
                    <div className="axi-card-body">
                      <span className="axi-label">
                        {p.taxonomy_version
                          ? "AI ΕΡΜΗΝΕΙΑ · ΠΡΟΣ ΕΛΕΓΧΟ"
                          : "ΤΑΞΙΝΟΜΗΣΗ ΣΕ ΕΚΚΡΕΜΟΤΗΤΑ"}
                      </span>
                      <h2>{p.user_job || p.title}</h2>
                      <p>{p.mechanism || p.title}</p>
                      <strong className="axi-price">{price(p)}</strong>
                      {p.listed_eur !== null && Number(p.listed_eur) < 50 ? (
                        <small>Κάτω από το όριο έρευνας των 50 €</small>
                      ) : null}
                      <Link
                        className="axi-card-link"
                        href={"/axi/product/" + p.aliexpress_product_id}
                      >
                        Τεκμήρια και περιορισμοί ↗
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
            {data.has_more && data.next_cursor ? (
              <nav className="axi-pagination" aria-label="Σελίδες καταλόγου">
                <Link
                  className="omap-primary"
                  href={
                    "/catalog?" +
                    new URLSearchParams({
                      after: String(data.next_cursor),
                      ...(s.problem ? { problem: s.problem } : {}),
                    })
                  }
                >
                  Επόμενες καταχωρίσεις →
                </Link>
                <Link href="/catalog">Αρχή καταλόγου</Link>
              </nav>
            ) : null}
          </>
        )}
        <p className="axi-note">
          Διαφάνεια: οι σύνδεσμοι αγοράς στις σελίδες προϊόντων ενδέχεται να
          αποφέρουν affiliate προμήθεια. Η έκδοση συνδέσμου από το API δεν
          επιβεβαιώνει απόδοση προμήθειας.
        </p>
      </section>
    </main>
  );
}
