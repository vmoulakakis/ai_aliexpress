import Link from "next/link";
import { getAxiData, PROBLEMS, type AxiData } from "../../lib/axi";
import {
  FoundHeader,
  FoundFooter,
  Icon,
  problemIcon,
  ProductCard,
  SourceNote,
} from "../../components/found/FoundUI";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Εξερεύνησε τις πιθανότητες | FOUND.",
  description:
    "Πραγματικές καταχωρίσεις ανά ανάγκη, με πηγές, τιμή EUR και ξεκάθαρα στοιχεία.",
};
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; problem?: string }>;
}) {
  const s = await searchParams;
  const problem =
    s.problem && Object.hasOwn(PROBLEMS, s.problem) ? s.problem : null;
  const query = new URLSearchParams({ limit: "36" });
  if (s.after && /^\d{1,12}$/.test(s.after)) query.set("after", s.after);
  if (problem) query.set("problem", problem);
  let data: AxiData | null = null;
  try {
    data = await getAxiData(query.toString());
  } catch {}
  return (
    <div className="hx-app" lang="el">
      <FoundHeader active="catalog" />
      <main id="found-main" className="hx-container">
        <section className="hx-catalog-hero">
          <span className="hx-overline">
            <i />
            FROM NEED TO POSSIBILITY
          </span>
          <h1>
            {problem ? (
              PROBLEMS[problem].title
            ) : (
              <>
                Οι πιθανότητες,
                <br />
                μπροστά σου.
              </>
            )}
          </h1>
          <p>
            {problem
              ? PROBLEMS[problem].description
              : "Εξερεύνησε πραγματικό εξοπλισμό μέσα από την ανάγκη που θέλεις να καλύψεις."}{" "}
            Οι ερμηνείες AI είναι υποθέσεις προς έλεγχο.
          </p>
        </section>
        <div className="hx-catalog-layout">
          <aside className="hx-catalog-nav">
            <span>ΕΞΕΡΕΥΝΗΣΗ ΑΝΑ ΑΝΑΓΚΗ</span>
            <nav aria-label="Φίλτρο ανάγκης">
              <Link
                href="/catalog"
                aria-current={!problem ? "page" : undefined}
              >
                <Icon name="grid" size={18} />
                Όλες οι πιθανότητες
              </Link>
              {Object.entries(PROBLEMS).map(([key, p]) => (
                <Link
                  key={key}
                  href={"/catalog?problem=" + key}
                  aria-current={problem === key ? "page" : undefined}
                >
                  <Icon name={problemIcon(key)} size={18} />
                  {p.title}
                </Link>
              ))}
            </nav>
            <p>
              Εμφανίζονται καταχωρίσεις με ρητή τιμή EUR ≥50 €. Το τελικό κόστος
              Ελλάδας χρειάζεται επιβεβαίωση.
            </p>
          </aside>
          <section className="hx-catalog-results" aria-label="Υποψήφιες λύσεις">
            <div className="hx-catalog-results-top">
              <strong>
                {data
                  ? `${data.items.length} καταχωρίσεις σε αυτή τη σελίδα`
                  : "Πηγή μη διαθέσιμη"}
              </strong>
              <span>Τιμή πηγής ≥50 € · Χωρίς τελικό κόστος αποστολής</span>
            </div>
            {!data ? (
              <div className="hx-unavailable">
                <Icon name="compass" size={35} />
                <h2>Η πηγή δεν απαντά.</h2>
                <p>Δοκίμασε ξανά. Δεν εμφανίζονται υποθετικά προϊόντα.</p>
                <a
                  className="hx-button hx-button-dark"
                  href={"/catalog" + (problem ? "?problem=" + problem : "")}
                >
                  Επανάληψη <Icon name="arrow" />
                </a>
              </div>
            ) : !data.items.length ? (
              <div className="hx-unavailable">
                <h2>Δεν υπάρχουν καταχωρίσεις σε αυτή την προβολή.</h2>
                <Link className="hx-button hx-button-dark" href="/catalog">
                  Όλες οι πιθανότητες <Icon name="arrow" />
                </Link>
              </div>
            ) : (
              <>
                <div className="hx-product-grid">
                  {data.items.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
                {data.has_more && data.next_cursor ? (
                  <nav className="hx-pagination" aria-label="Σελίδες καταλόγου">
                    <Link
                      className="hx-button hx-button-dark"
                      href={
                        "/catalog?" +
                        new URLSearchParams({
                          after: String(data.next_cursor),
                          ...(problem ? { problem } : {}),
                        })
                      }
                    >
                      Επόμενες καταχωρίσεις <Icon name="arrow" size={18} />
                    </Link>
                    <Link
                      href={"/catalog" + (problem ? "?problem=" + problem : "")}
                    >
                      Στην αρχή
                    </Link>
                  </nav>
                ) : null}
              </>
            )}
            <SourceNote />
          </section>
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
