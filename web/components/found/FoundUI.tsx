import Link from "next/link";
import {
  price,
  problemName,
  safeAxiUrl,
  type AxiProduct,
} from "../../lib/axi-shared";
import "./found.css";
export function Icon({
  name = "arrow",
  size = 20,
}: {
  name?: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    arrow: "M5 12h14m-6-6 6 6-6 6",
    diagonal: "M6 18 18 6M6 6h12v12",
    left: "m14 6-6 6 6 6",
    right: "m10 6 6 6-6 6",
    search: "m20 20-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    compass: "m16 8-3 5-5 3 3-5 5-3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    check: "m5 12 4 4L19 6",
    plus: "M12 4v16M4 12h16",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    source: "M8 3H5v18h14V7l-4-4H8m6 0v5h5M8 12h8M8 16h6",
    close: "m6 6 12 12M6 18 18 6",
    spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3",
    tool: "m14 6 4 4-9 9-4-4 9-9m-1 1a5 5 0 0 1 7-5l-3 3 2 2 3-3a5 5 0 0 1-5 7",
    layers: "m12 3 10 6-10 6L2 9l10-6M2 14l10 6 10-6",
    camera: "M4 6h4l2-3h4l2 3h4v14H4zM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    food: "M5 3v6a3 3 0 0 0 6 0V3M8 3v19M18 3v19M18 3c-4 3-4 9 0 9",
    water: "M12 3C10 7 5 12 5 16a7 7 0 0 0 14 0c0-4-5-9-7-13",
    thread: "M6 4h12M6 20h12M8 4c6 4 2 12 8 16M16 4c-6 4-2 12-8 16",
    box: "m12 2 9 5v10l-9 5-9-5V7l9-5m-9 5 9 5 9-5M12 12v10",
    lab: "M8 3h8M9 3v7L4 20h16l-5-10V3M7 15h10",
    shield: "m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7l8-4m-4 9 3 3 5-6",
    plant:
      "M12 22V12M12 12C4 13 2 7 3 3c7 0 10 3 9 9m0 3c7 0 10-4 9-8-7 0-10 3-9 8",
    energy: "m13 2-9 12h7l-1 8L21 9h-8l1-7",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
export const problemIcon = (key: string) =>
  (
    ({
      "equipment-maintenance": "tool",
      "precision-manufacturing": "layers",
      "inspect-hidden-damage": "camera",
      "food-production": "food",
      "textile-production": "thread",
      "fluid-handling": "water",
      "lab-workflows": "lab",
      "workspace-safety": "shield",
      "material-handling": "box",
      "grow-and-irrigate": "plant",
      "energy-management": "energy",
    }) as Record<string, string>
  )[key] || "spark";
export function FoundHeader({
  active = "home",
}: {
  active?: "home" | "map" | "catalog" | "product";
}) {
  return (
    <>
      <a className="hx-skip" href="#found-main">
        Μετάβαση στο περιεχόμενο
      </a>
      <header className="hx-header">
        <Link href="/" className="hx-brand" aria-label="FOUND. αρχική">
          <span className="hx-brand-mark">
            <i />
            <i />
            <i />
          </span>
          found<span className="hx-brand-dot">.</span>
        </Link>
        <nav aria-label="Κύρια πλοήγηση">
          <Link aria-current={active === "home" ? "page" : undefined} href="/">
            Ανακάλυψε
          </Link>
          <Link
            aria-current={active === "map" ? "page" : undefined}
            href="/opportunities"
          >
            Χάρτης αναγκών
          </Link>
          <Link
            aria-current={active === "catalog" ? "page" : undefined}
            href="/catalog"
          >
            Λύσεις
          </Link>
        </nav>
        <span className="hx-market">
          <span />
          Ελλάδα <i>/</i> EUR
        </span>
        <Link className="hx-header-cta" href="/catalog">
          Εξερεύνηση <Icon name="diagonal" size={15} />
        </Link>
      </header>
    </>
  );
}
export function FoundFooter() {
  return (
    <footer className="hx-footer">
      <div className="hx-footer-top">
        <Link href="/" className="hx-wordmark">
          found<span>.</span>
        </Link>
        <p>
          Μια πιο ουσιαστική αρχή
          <br />
          για την επόμενη ανακάλυψή σου.
        </p>
        <nav aria-label="Πληροφορίες">
          <Link href="/opportunities">Χάρτης αναγκών</Link>
          <Link href="/catalog">Υποψήφιες λύσεις</Link>
          <Link href="/discover">AXI Agent ↗</Link>
        </nav>
      </div>
      <div className="hx-footer-bottom">
        <span>FOUND. / GREECE / INTELLIGENT DISCOVERY</span>
        <p>
          Πραγματικές καταχωρίσεις · Ερμηνείες AI προς έλεγχο. Από affiliate
          αγορές ενδέχεται να λάβουμε προμήθεια, χωρίς επιπλέον χρέωση από εμάς.
        </p>
      </div>
    </footer>
  );
}
export function ProductCard({
  product: p,
  index = 0,
  headingLevel = 3,
}: {
  product: AxiProduct;
  index?: number;
  headingLevel?: 2 | 3;
}) {
  const image = safeAxiUrl(p.image_url, "image");
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="hx-product-card">
      <Link
        href={"/axi/product/" + p.aliexpress_product_id}
        className={"hx-product-image hx-tint-" + (index % 4)}
      >
        <span className="hx-card-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        {image ? (
          <img
            src={image}
            alt={p.title}
            width={500}
            height={400}
            loading="lazy"
          />
        ) : (
          <span className="hx-image-missing">
            <Icon name="source" />
            Εικόνα μη διαθέσιμη
          </span>
        )}
        <span className="hx-image-arrow">
          <Icon name="diagonal" />
        </span>
      </Link>
      <div className="hx-product-body">
        <span className="hx-eyebrow">
          {p.problem_keys?.[0]
            ? problemName(p.problem_keys[0])
            : "Υποψήφια λύση"}
        </span>
        <Heading>
          <Link href={"/axi/product/" + p.aliexpress_product_id}>
            {p.user_job || p.title}
          </Link>
        </Heading>
        <p>
          {p.mechanism ||
            "Δες την αρχική καταχώριση και τα διαθέσιμα στοιχεία."}
        </p>
        <div className="hx-product-price">
          <strong>{price(p)}</strong>
          <span>τιμή καταχώρισης</span>
        </div>
        <div className="hx-product-bottom">
          <span>
            <i />
            AI ερμηνεία · προς έλεγχο
          </span>
          <Link
            href={"/axi/product/" + p.aliexpress_product_id}
            aria-label={"Στοιχεία για " + (p.user_job || p.title)}
          >
            <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function SourceNote() {
  return (
    <p className="hx-source-note">
      <Icon name="source" size={17} />
      <span>
        Στοιχεία και εικόνες από την καταχώριση πωλητή. Τελικό κόστος Ελλάδας,
        SKU, παράδοση και αξιοπιστία χρειάζονται επιβεβαίωση.
      </span>
    </p>
  );
}
