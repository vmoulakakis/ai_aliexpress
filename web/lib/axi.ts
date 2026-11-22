import { cache } from "react";
import type { AxiData } from "./axi-shared";
export * from "./axi-shared";
export const AXI_API =
  "https://gqpbskssrvpfjtujwezc.supabase.co/functions/v1/axi-catalog";
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
