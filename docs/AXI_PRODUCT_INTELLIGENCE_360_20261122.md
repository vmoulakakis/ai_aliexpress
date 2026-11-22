# AXI Product Intelligence 360 — implemented database phase

Implemented in Supabase VMDB private `axi` schema on 2026-11-22.

## Reference
Reviewed prior FOUND_EUROPE_ALIHELPER_FINAL_2026-11-22.zip / docs/ALIHELPER_FEATURES_FINAL.md. AliHelper is **inspiration**, not an API integration or source of ratings/reviews.

## Live tables
- `product_features_360`: sourced catalog facts and explicit unknown fields (1,038 profiles).
- `product_attributes`: normalized per-attribute specification/evidence.
- `review_evidence`: rating, review body, photo URLs, provenance, authenticity status; **0 real reviews so far**.
- `price_observations`: timestamped listed and delivered price separately; 1,027 listed observations. Do not label this 6-month history.
- `seller_metrics`: measured seller reputation; currently unpopulated.
- `product_families`: conservative **provisional** category + title-prefix grouping; confidence 0.35, requires exact model/spec matching before trusting similarity.
- `product_ranking`: 1,038 UNRATED records; no fabricated score.
- `top_three_per_family`: caps each provisional family to 3; verification and score take precedence when available.

## Verified checks
- 1,038 profiles, 1,027 historical price observations, 1,038 provisional family assignments, 1,038 UNRATED rankings.
- 1,035 visible rows in top-three view; 0 groups exceed 3.
- 0 sourced reviews and 0 verified ranking scores. Need legitimate review provider and seller evidence.
- Grouping is currently weak: 1,035 of 1,038 remain in the top-three view, so it does **not** achieve robust semantic deduplication. Next task is spec-aware clustering and cross-seller exact-equivalent matching.

## Product intelligence ranking policy
Separate (1) consumer relevance (2) independent seller/review trust (3) delivered value versus verified Greek comparables (4) provenance confidence and (5) affiliate economics, which must not distort consumer ranking. Unknown facts stay unknown. Seller reliability requires sample sizes, dispute and age evidence; reviews require provenance and photo permission. No invented 360 data points, scores or reviews.

## Next
Build authenticated data enrichment worker, seller/review provider adapters, product-specific affiliate links, SKU specs and similarity model; capture repeated prices over time; obtain embeddings and demand signals; show top 3 *verified* equivalent offers per actual product family.
