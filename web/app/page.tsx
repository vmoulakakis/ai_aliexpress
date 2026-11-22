import DiscoveryExperience from "../components/found/DiscoveryExperience";
import { getAxiLanding } from "../lib/axi-landing";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "FOUND. — Κάθε ανάγκη, μια νέα πιθανότητα.",
  description:
    "Εξερεύνησε πραγματικές καταχωρίσεις ανά ανάγκη, με ερμηνεία AI, πηγές και ξεκάθαρα στοιχεία.",
};
export default async function Page() {
  const { data, seeds } = await getAxiLanding();
  return <DiscoveryExperience data={data} seeds={seeds} />;
}
