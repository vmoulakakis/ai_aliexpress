import { cache } from "react";
import { getAxiData, type AxiData, type AxiProduct } from "./axi";
const groups = [
  "inspect-hidden-damage",
  "precision-manufacturing",
  "food-production",
];
export const getAxiLanding = cache(async () => {
  const results = await Promise.allSettled([
    getAxiData("limit=1"),
    ...groups.map((problem) =>
      getAxiData(new URLSearchParams({ problem, limit: "4" }).toString()),
    ),
  ]);
  const data: AxiData | null =
    results[0].status === "fulfilled" ? results[0].value : null;
  const seeds: Record<string, AxiProduct[]> = {};
  groups.forEach((g, i) => {
    const r = results[i + 1];
    if (r.status === "fulfilled") seeds[g] = r.value.items;
  });
  return { data, seeds };
});
