import DiscoveryExperience from "../../components/found/DiscoveryExperience";
import { getAxiLanding } from "../../lib/axi-landing";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Χάρτης αναγκών | FOUND.",
  description:
    "Ένας διαδραστικός χάρτης πιθανών χρήσεων με πραγματικές καταχωρίσεις, πηγές και ερμηνεία AI.",
};
export default async function OpportunityMap() {
  const { data, seeds } = await getAxiLanding();
  return <DiscoveryExperience data={data} seeds={seeds} mode="map" />;
}
