# Optional AliExpress Reviews API — bounded enrichment contract

## Source and authorization
User supplied a third-party reviews endpoint `GET https://api.aliexpress-reviews.com/v1/reviews/{product_id}` and a daily quota of 100 calls. **Never commit or log the API key.** A key was shared in conversation; rotate it before using it. Configure a server-side Supabase Vault or encrypted worker secret named `ALIEXPRESS_REVIEWS_API_KEY` after rotation. This endpoint is third-party, not the official AliExpress Affiliate API.

## Integration gate
1. Verify provider legitimacy, terms, attribution and permitted storage/republication of reviews.
2. After rotation, perform ONE real call against a product ID already in `axi.products`; capture only status, sanitized response shape, quota headers and source timestamp, never the secret.
3. Reject fabricated review text, ratings, authors, dates and review counts. Preserve provenance, response timestamp, and distinguish aggregated rating from individual review evidence.
4. Start with at most 5 diagnostic calls. No bulk calls until sample response validated and a bounded quota scheduler is in place.

## Quota-safe scheduler
- Hard cap: **<= 90 requests per provider-defined day**, reserve 10 for retries/manual checks.
- Respect 429, Retry-After, timezone/reset headers and explicit provider terms. Never retry immediately on 429.
- Prioritize: real AliExpress product ID, official affiliate link present, high-quality evidence, no fresh review evidence, then commercial opportunity. No blind full-catalog sweep.
- Idempotency: one call per product per refresh window, persisted attempt ledger, no concurrent double-spend. Backoff with circuit breaker.
- At most 90 distinct products/day, so 1,038 IDs require at least 12 days at 90/day, assuming no failures. No promise of completion if provider denies access or returns no reviews.
- Store permitted fields in private `axi.review_evidence` with source/provider, external review ID, fetched_at, evidence confidence and raw response only where terms allow. Do not mix SocialMarket.
- Never publish personal data from review authors without legal basis and minimization. Do not display a review count or AggregateRating schema without verified data.

## Implementation status
**Documented only.** No provider API calls made, no API key stored, no review data ingested and no scheduler deployed by this document. User must rotate the exposed key before live testing.

## Handoff
Work should implement a minimal server-side connector, test contract, quota ledger, safe retry policy, and dry-run mode before activating ingestion. Obtain rotated secret via secure secret management, never from committed files.
