"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  PROBLEMS,
  matchesNeed,
  price,
  safeAxiUrl,
  problemName,
  type AxiData,
  type AxiProduct,
} from "../../lib/axi-shared";
import {
  FoundFooter,
  FoundHeader,
  Icon,
  problemIcon,
  ProductCard,
  SourceNote,
} from "./FoundUI";
type Seeds = Record<string, AxiProduct[]>;
export function ProductFocus({ products }: { products: AxiProduct[] }) {
  const [active, setActive] = useState(0);
  const touch = useRef<number | null>(null);
  const total = products.length;
  const move = (n: number) => setActive((a) => (a + n + total) % total);
  const keyboard = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      e.currentTarget.focus();
      move(e.key === "ArrowRight" ? 1 : -1);
    }
  };
  if (!total)
    return (
      <div className="hx-gallery-empty">
        <Icon name="compass" size={40} />
        <p>Οι καταχωρίσεις δεν είναι διαθέσιμες αυτή τη στιγμή.</p>
        <Link href="/catalog">Δοκίμασε τον κατάλογο ↗</Link>
      </div>
    );
  const focus = products[active];
  return (
    <section
      className="hx-focus"
      aria-label="Οπτική εξερεύνηση πραγματικών καταχωρίσεων"
    >
      <div
        className="hx-reel"
        tabIndex={0}
        onKeyDown={keyboard}
        aria-label="Συλλογή λύσεων. Χρησιμοποίησε τα βελάκια για αλλαγή προϊόντος."
        onTouchStart={(e) => {
          touch.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const d = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(d) > 40) move(d < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <div className="hx-reel-floor" aria-hidden="true" />
        {products.map((p, i) => {
          let distance = (i - active + total) % total;
          if (distance > total / 2) distance -= total;
          if (Math.abs(distance) > 3) return null;
          const image = safeAxiUrl(p.image_url, "image");
          return (
            <button
              key={p.id}
              className={"hx-reel-card " + (distance === 0 ? "is-current" : "")}
              style={
                {
                  "--slot": distance,
                  "--depth": Math.abs(distance),
                  "--turn":
                    distance === 0 ? "0deg" : (distance > 0 ? -15 : 15) + "deg",
                } as CSSProperties
              }
              onClick={() => setActive(i)}
              tabIndex={distance === 0 ? 0 : -1}
              aria-label={"Προβολή " + (p.user_job || p.title)}
              aria-pressed={distance === 0}
            >
              <div className={"hx-reel-photo hx-tint-" + (i % 4)}>
                {image ? (
                  <img
                    src={image}
                    alt={p.title}
                    width={400}
                    height={400}
                    loading={Math.abs(distance) < 2 ? "eager" : "lazy"}
                  />
                ) : (
                  <Icon name="source" size={52} />
                )}
                <span className="hx-reel-category">
                  <Icon
                    name={problemIcon(p.problem_keys?.[0] || "other")}
                    size={14}
                  />
                  {p.problem_keys?.[0]
                    ? PROBLEMS[p.problem_keys[0]]?.title
                    : "Καταχώριση πηγής"}
                </span>
              </div>
              <span className="hx-reel-title">{p.user_job || p.title}</span>
              <span className="hx-reel-price">
                {price(p)} <small>τιμή πηγής</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="hx-focus-dock">
        <div className="hx-reel-controls">
          <button aria-label="Προηγούμενο προϊόν" onClick={() => move(-1)}>
            <Icon name="left" />
          </button>
          <span>
            {String(active + 1).padStart(2, "0")}
            <i>/</i>
            {String(total).padStart(2, "0")}
          </span>
          <button aria-label="Επόμενο προϊόν" onClick={() => move(1)}>
            <Icon name="right" />
          </button>
        </div>
        <div className="hx-focus-caption" aria-live="polite">
          <span>ΣΤΟ ΕΠΙΚΕΝΤΡΟ</span>
          <strong>{focus.user_job || focus.title}</strong>
        </div>
        <Link
          className="hx-text-link"
          href={"/axi/product/" + focus.aliexpress_product_id}
        >
          Δες τα στοιχεία <Icon name="diagonal" size={17} />
        </Link>
      </div>
    </section>
  );
}
export function NeedExplorer({
  data,
  seeds,
}: {
  data: AxiData | null;
  seeds: Seeds;
}) {
  const initial = "inspect-hidden-damage";
  const [selected, setSelected] = useState(initial);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<AxiProduct[]>(seeds[initial] || []);
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");
  const [retry, setRetry] = useState(0);
  const cache = useRef<Seeds>({ ...seeds });
  const clusters = data?.clusters || [];
  const current = clusters.find((c) => c.problem_key === selected);
  const visible = clusters.filter((c) => matchesNeed(c.problem_key, query));
  useEffect(() => {
    if (cache.current[selected]) {
      setProducts(cache.current[selected]);
      setState("ready");
      return;
    }
    const controller = new AbortController();
    setProducts([]);
    setState("loading");
    fetch(
      "/api/axi/catalog?" +
        new URLSearchParams({ problem: selected, limit: "3" }),
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw Error("unavailable");
        const d = await r.json();
        if (d.source !== "axi" || !Array.isArray(d.items))
          throw Error("invalid");
        return d.items as AxiProduct[];
      })
      .then((items) => {
        cache.current[selected] = items;
        setProducts(items);
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, [selected, retry]);
  if (!data)
    return (
      <section className="hx-section hx-unavailable" id="needs">
        <Icon name="compass" size={36} />
        <h2>Ο χάρτης θα επιστρέψει σύντομα.</h2>
        <p>Η πηγή δεν ανταποκρίνεται. Δεν εμφανίζουμε υποθετικές μετρήσεις.</p>
        <a className="hx-button hx-button-dark" href="/opportunities">
          Επανάληψη <Icon name="arrow" />
        </a>
      </section>
    );
  return (
    <section className="hx-needs" id="needs">
      <div className="hx-section-heading">
        <div>
          <span className="hx-overline">
            <i />
            THE NEED EXPLORER
          </span>
          <h2>
            Σκέψου ανάγκη.
            <br />
            <span>Όχι κατηγορία.</span>
          </h2>
        </div>
        <p>
          Διάλεξε αυτό που θέλεις να πετύχεις. Η ταξινόμηση AI συνδέει τις
          καταχωρίσεις με πιθανές χρήσεις.
        </p>
      </div>
      <div className="hx-explorer">
        <div className="hx-need-list">
          <label className="hx-need-search">
            <Icon name="search" size={18} />
            <span className="hx-sr-only">Αναζήτηση ανάγκης</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Βρες μια ανάγκη…"
              type="search"
            />
          </label>
          <div
            className="hx-need-options"
            role="group"
            aria-label="Ανάγκες προς εξερεύνηση"
          >
            {visible.map((c) => (
              <button
                key={c.problem_key}
                aria-pressed={selected === c.problem_key}
                className={selected === c.problem_key ? "is-active" : ""}
                onClick={() => setSelected(c.problem_key)}
              >
                <span className="hx-need-icon">
                  <Icon name={problemIcon(c.problem_key)} />
                </span>
                <span>{problemName(c.problem_key)}</span>
                <small>{c.eligible}</small>
                <Icon name="right" size={15} />
              </button>
            ))}
            {!visible.length ? (
              <p className="hx-no-results">
                Δεν βρέθηκε αντίστοιχη ανάγκη. Δοκίμασε «επισκευή», «υγρά» ή
                καθάρισε την αναζήτηση.
              </p>
            ) : null}
          </div>
          <p className="hx-list-note">
            Πλήθος υποψηφίων ≥50 €, όχι μέτρηση ζήτησης.
          </p>
        </div>
        <div className="hx-need-result" aria-busy={state === "loading"}>
          <div className="hx-need-result-top">
            <span className="hx-line-icon">
              <Icon name={problemIcon(selected)} size={30} />
            </span>
            <span className="hx-mini-tag">AI / ΠΙΘΑΝΗ ΧΡΗΣΗ</span>
          </div>
          <h3>{problemName(selected)}</h3>
          <p>{PROBLEMS[selected]?.description}</p>
          <div className="hx-need-economy">
            <strong>{current?.eligible ?? "—"}</strong>
            <span>
              υποψήφιες καταχωρίσεις
              <br />
              με τιμή EUR ≥50 €
            </span>
            <div
              className="hx-need-distribution"
              aria-label={
                current
                  ? `${current.eligible} από ${current.products} ταξινομημένους υποψηφίους έχουν τιμή τουλάχιστον 50 ευρώ`
                  : undefined
              }
            >
              <i
                style={{
                  width:
                    current && current.products
                      ? (current.eligible / current.products) * 100 + "%"
                      : "0%",
                }}
              />
            </div>
          </div>
          <div className="hx-mini-products" aria-live="polite">
            {state === "loading" ? (
              <p className="hx-loading">
                <i />
                Φόρτωση καταχωρίσεων από την πηγή…
              </p>
            ) : state === "error" ? (
              <div className="hx-query-error">
                <p>Οι λύσεις δεν φορτώθηκαν.</p>
                <button onClick={() => setRetry((r) => r + 1)}>
                  Προσπάθησε ξανά <Icon name="arrow" size={16} />
                </button>
              </div>
            ) : products.length ? (
              products.slice(0, 3).map((p) => {
                const image = safeAxiUrl(p.image_url, "image");
                return (
                  <Link
                    key={p.id}
                    href={"/axi/product/" + p.aliexpress_product_id}
                  >
                    <div>
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          width={70}
                          height={70}
                          loading="lazy"
                        />
                      ) : (
                        <Icon name="source" />
                      )}
                    </div>
                    <span>
                      <strong>{p.user_job || p.title}</strong>
                      <small>{price(p)} · τιμή καταχώρισης</small>
                    </span>
                    <Icon name="diagonal" size={16} />
                  </Link>
                );
              })
            ) : (
              <p>
                Δεν υπάρχουν διαθέσιμες καταχωρίσεις ≥50 € σε αυτή την ομάδα.
              </p>
            )}
          </div>
          <Link
            className="hx-button hx-button-white"
            href={"/catalog?problem=" + selected}
          >
            Εξερεύνησε όλες τις λύσεις <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
export default function DiscoveryExperience({
  data,
  seeds,
  mode = "home",
}: {
  data: AxiData | null;
  seeds: Seeds;
  mode?: "home" | "map";
}) {
  const seen = new Set<string>();
  const showcase = Object.values(seeds)
    .flat()
    .filter((p) => {
      if (seen.has(p.aliexpress_product_id)) return false;
      seen.add(p.aliexpress_product_id);
      return !!safeAxiUrl(p.image_url, "image");
    });
  const summary = data?.summary;
  return (
    <div className="hx-app" lang="el">
      <FoundHeader active={mode === "home" ? "home" : "map"} />
      <main id="found-main">
        {mode === "home" ? (
          <>
            <section className="hx-hero">
              <span className="hx-overline">
                <i />
                NOT ANOTHER PRODUCT CATALOGUE
              </span>
              <h1>
                Κάθε ανάγκη,
                <br />
                <span>μια νέα πιθανότητα.</span>
              </h1>
              <p>
                Ανακάλυψε εξοπλισμό πέρα από τα συνηθισμένα.
                <br className="hx-desktop-break" /> Πραγματικές καταχωρίσεις,
                ερμηνεία AI, ξεκάθαρα στοιχεία.
              </p>
              <div className="hx-hero-actions">
                <a href="#needs" className="hx-button hx-button-dark">
                  Βρες την ανάγκη σου <Icon name="diagonal" size={17} />
                </a>
                <Link href="/catalog" className="hx-hero-secondary">
                  Εξερεύνησε τις λύσεις <Icon name="arrow" size={17} />
                </Link>
              </div>
            </section>
            <ProductFocus products={showcase} />
          </>
        ) : (
          <section className="hx-map-intro hx-container">
            <span className="hx-overline">
              <i />
              PROBLEM → POSSIBILITY
            </span>
            <h1>
              Το σωστό σημείο
              <br />
              για να <em>ξεκινήσεις.</em>
            </h1>
            <p>
              Ένας χάρτης πιθανών χρήσεων, χτισμένος πάνω σε πραγματικές
              καταχωρίσεις. Εσύ επιλέγεις την ανάγκη. Τα στοιχεία μένουν ορατά.
            </p>
          </section>
        )}
        {summary ? (
          <section
            className="hx-proof-strip hx-container"
            aria-label="Πραγματικά στοιχεία της πηγής"
          >
            <div>
              <strong>{summary.products.toLocaleString("el-GR")}</strong>
              <span>πραγματικοί κωδικοί</span>
            </div>
            <i />
            <div>
              <strong>{data?.clusters.length}</strong>
              <span>ανάγκες με ταξινόμηση AI</span>
            </div>
            <i />
            <div>
              <strong>{summary.eligible.toLocaleString("el-GR")}</strong>
              <span>με τιμή ≥50 €</span>
            </div>
            <div className="hx-proof-context">
              <Icon name="source" size={17} />
              <span>
                Πηγή: AXI / AliExpress API
                <br />
                Τα στοιχεία αγοράς παραμένουν προς έλεγχο.
              </span>
            </div>
          </section>
        ) : null}
        <div className="hx-container">
          <NeedExplorer data={data} seeds={seeds} />
          {mode === "home" && showcase.length ? (
            <section className="hx-selection hx-section">
              <div className="hx-section-heading">
                <div>
                  <span className="hx-overline">
                    <i />A DIFFERENT WAY TO DISCOVER
                  </span>
                  <h2>Μπες στις λεπτομέρειες.</h2>
                </div>
                <Link className="hx-text-link" href="/catalog">
                  Όλες οι καταχωρίσεις <Icon name="diagonal" size={17} />
                </Link>
              </div>
              <div className="hx-product-grid">
                {showcase.slice(0, 3).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
              <SourceNote />
            </section>
          ) : null}
          <section className="hx-evidence-story hx-section">
            <div className="hx-evidence-title">
              <span className="hx-overline">
                <i />
                CURIOSITY, WITH CONTEXT
              </span>
              <h2>
                Η ανακάλυψη είναι
                <br />
                μόνο η αρχή.
              </h2>
              <p>
                Μια ενδιαφέρουσα καταχώριση δεν είναι ακόμη μια αποδεδειγμένα
                καλή αγορά. Δες τι γνωρίζουμε πριν αποφασίσεις.
              </p>
              <Link className="hx-text-link" href="/catalog">
                Εξερεύνησε με ανοιχτά μάτια <Icon name="diagonal" size={17} />
              </Link>
            </div>
            <div className="hx-evidence-steps">
              {[
                [
                  "01",
                  "Το προϊόν είναι πραγματικό",
                  "Κωδικός και στοιχεία από την καταχώριση της πηγής.",
                ],
                [
                  "02",
                  "Η σύνδεση είναι ερμηνεία AI",
                  "Πιθανή χρήση, μηχανισμός και χρήστης — με πηγή, όχι πιστοποίηση.",
                ],
                [
                  "03",
                  "Η τελική απόφαση χρειάζεται έλεγχο",
                  "Συμβατότητα, πωλητής, αποστολή και τελικό κόστος Ελλάδας.",
                ],
              ].map(([n, t, d]) => (
                <article key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
      <FoundFooter />
    </div>
  );
}
