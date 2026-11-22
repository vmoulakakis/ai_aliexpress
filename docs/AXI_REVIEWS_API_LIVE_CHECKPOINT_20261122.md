# AXI third-party review API — LIVE checkpoint (2026-11-22)

## Verified
- User-supplied third-party endpoint `https://api.aliexpress-reviews.com/v1/reviews/{product_id}` returned HTTP 200 from Supabase with a secret read from Vault.
- Secret stored in Vault as `aliexpress_reviews_api_key`, not committed. The originally shared key was exposed in chat; rotation remains recommended.
- First diagnostic product returned `total:0`, empty `data`.
- Second diagnostic product `1005011946640342` returned `total:1`, averageRating 5, one review record with **empty review text**.
- Live migration `axi_third_party_reviews_sample_and_quota_20261122` created private `axi.third_party_review_snapshots`, `axi.review_api_usage`, and admin-only `axi.fetch_review_sample(p_limit)` function.
- Function has 90 UTC-day recorded-call cap and stops on HTTP 429; no public grants.
- Ran one 5-product sample: 5 snapshots saved, 4 had `total_reviews>0`.
- The two initial diagnostic API calls occurred **before** the quota ledger was created and are **not counted** by the database cap. Therefore provider usage today is at least 7 calls, not merely the five ledger entries.

## Limitations
- Not yet verified: provider terms for republishing review content, quota reset timezone, whether quota counts failed calls, exact provider source provenance.
- Raw response stored privately; public rendering requires data minimization and terms review.
- Not all returned reviews contain review text; don't invent any.
- No scheduled worker or production front-end review rendering implemented.
- Manual admin-only call: `select axi.fetch_review_sample(5);` (uses quota and network). Inspect usage and API errors before scaling.
- Current function cap is based on recorded calls in UTC and may differ from provider day; avoid running near provider quota boundary.

## Next Work tasks
1. Review security, provider TOS, quota headers and API source authenticity.
2. Build safe evidence normalization for `axi.review_evidence` preserving individual review IDs and timestamps, and avoid duplicates.
3. Create scheduled bounded worker with rate limits and 429 handling, no repeated calls to same product.
4. Test source-to-display mapping, no synthetic ratings.
