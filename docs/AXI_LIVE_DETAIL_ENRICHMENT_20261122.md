# AXI live product-detail enrichment results (2026-11-22)

- AliExpress affiliate `aliexpress.affiliate.productdetail.get` successfully verified live with HTTP 200.
- Verified multi-ID batch query returning 3 of 3 test products.
- Installed private, admin-only Supabase function `axi.enrich_product_details(batch_size)` (1..20).
- Function reads affiliate credentials from Supabase Vault without returning secrets, signs HMAC-SHA256, retrieves API data, stores raw responses in `axi.product_detail_enrichment`, and adds sourced fields to `axi.product_features_360`.
- Ran 56 batches of up to 20; resulting **1,015 / 1,038** products with detail payloads.
- **23** catalog IDs not returned by detail API and recorded in `axi.product_enrichment_issues` for further investigation.
- Detail payloads: `sku_id` in 1,015; `evaluate_rate` in 276; no actual review text fetched.
- Do not conflate app_sale_price with target_sale_price or final delivered GR price. No shipping price verified.
- No production schedule configured; do not claim recurring automation.
- Next: repair retry selection to exclude known missing IDs; audit returned currency and price, extract SKU specifications; verify shipping methods; seller and review enrichment from permitted sources; independent demand and Greek comparables; quality-scored top-three grouping.
