import { cache } from "react";
export const AXI_API =
  "https://gqpbskssrvpfjtujwezc.supabase.co/functions/v1/axi-catalog";
export const PROBLEMS: Record<string, { title: string; description: string }> =
  {
    "equipment-maintenance": {
      title: "Να λειτουργήσει ξανά ο εξοπλισμός",
      description: "Συντήρηση, ανταλλακτικά και έλεγχος συμβατότητας.",
    },
    "precision-manufacturing": {
      title: "Να κατασκευάσω με ακρίβεια",
      description: "Κατεργασία, χάραξη και μετρήσεις με λιγότερες αστοχίες.",
    },
    "inspect-hidden-damage": {
      title: "Να δω εκεί που δεν φτάνω",
      description: "Επιθεώρηση σωλήνων, μηχανών και δυσπρόσιτων σημείων.",
    },
    "food-production": {
      title: "Να οργανώσω την παραγωγή τροφίμων",
      description: "Προετοιμασία και επεξεργασία, με χωριστό έλεγχο υγιεινής.",
    },
    "textile-production": {
      title: "Να δημιουργήσω και να επισκευάσω ύφασμα",
      description: "Ραφή, κέντημα και τα κατάλληλα εξαρτήματα.",
    },
    "fluid-handling": {
      title: "Να ελέγξω τη ροή υγρών",
      description: "Άντληση και κυκλοφορία με έλεγχο υλικού και εφαρμογής.",
    },
    "lab-workflows": {
      title: "Να οργανώσω εργαστηριακές εργασίες",
      description: "Εξοπλισμός και εξαρτήματα· χωρίς ιατρική πιστοποίηση.",
    },
    "workspace-safety": {
      title: "Να περιορίσω την έκθεση στην εργασία",
      description: "Υποψήφιες λύσεις προστασίας που χρειάζονται πιστοποίηση.",
    },
    "material-handling": {
      title: "Να μεταφέρω και να συσκευάσω υλικά",
      description: "Χειρισμός υλικών, συσκευασία και οργάνωση.",
    },
    "grow-and-irrigate": {
      title: "Να φροντίσω την καλλιέργεια",
      description: "Άρδευση και γεωργικές εφαρμογές.",
    },
    "energy-management": {
      title: "Να ελέγξω την ηλεκτρική ισχύ",
      description:
        "Μέτρηση και χειρισμός· συμβατότητα και εγκατάσταση προς έλεγχο.",
    },
    other: {
      title: "Χρειάζεται καλύτερη ερμηνεία",
      description: "Η σύνδεση με συγκεκριμένη ανάγκη παραμένει ασαφής.",
    },
  };
export type AxiProduct = {
  id: number;
  aliexpress_product_id: string;
  title: string;
  listed_eur: number | string | null;
  image_url: string | null;
  source_url: string;
  affiliate_url: string | null;
  affiliate_status: string;
  observed_at: string;
  problem_keys: string[] | null;
  user_job: string | null;
  mechanism: string | null;
  persona: string | null;
  confidence: number | string | null;
  evidence_quote: string | null;
  source_document_id: number | null;
  taxonomy_version: string | null;
  model: string | null;
  review_status: string | null;
  classified_at: string | null;
};
export type AxiData = {
  source: "axi";
  country: "GR";
  generated_at: string;
  summary: {
    products: number;
    priced: number;
    eligible: number;
    classified: number;
    affiliate_generated: number;
    verified: number;
    taxonomy_version: string;
  };
  clusters: { problem_key: string; products: number; eligible: number }[];
  items: AxiProduct[];
  next_cursor: number | null;
  has_more: boolean;
};
// A URL shape is not proof of attribution or commission eligibility.
export function safeAxiUrl(
  value: unknown,
  kind: "affiliate" | "image" | "source",
): string | null {
  if (typeof value !== "string" || value.length > 6000) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      return null;
    const allowed =
      kind === "affiliate"
        ? u.hostname === "s.click.aliexpress.com" &&
          /^\/(e|s)\//.test(u.pathname)
        : kind === "source"
          ? ["www.aliexpress.com", "aliexpress.com"].includes(u.hostname)
          : ["aliexpress-media.com", "alicdn.com"].some(
              (d) => u.hostname === d || u.hostname.endsWith("." + d),
            );
    return allowed ? u.href : null;
  } catch {
    return null;
  }
}
export const price = (p: AxiProduct) =>
  p.listed_eur !== null &&
  Number.isFinite(Number(p.listed_eur)) &&
  Number(p.listed_eur) > 0
    ? new Intl.NumberFormat("el-GR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }).format(Number(p.listed_eur))
    : "Τιμή άγνωστη";
export const problemName = (key: string) =>
  PROBLEMS[key]?.title || "Αταξινόμητη ανάγκη";
export const getAxiData = cache(
  async (query: string = "limit=24"): Promise<AxiData> => {
    const key = process.env.AXI_CATALOG_ANON_KEY;
    if (!key) throw new Error("AXI catalog unavailable");
    const r = await fetch(AXI_API + "?" + query, {
      headers: { authorization: "Bearer " + key, apikey: key },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(18000),
    });
    if (!r.ok) throw new Error("AXI catalog unavailable");
    const d = await r.json();
    if (
      d.source !== "axi" ||
      d.country !== "GR" ||
      !Array.isArray(d.items) ||
      !Array.isArray(d.clusters) ||
      !d.summary ||
      !Number.isInteger(d.summary.products) ||
      d.error
    )
      throw new Error("Invalid AXI projection");
    return d;
  },
);
