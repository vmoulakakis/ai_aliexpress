# FOUND Neural RAG — 1,000 AliExpress candidates

Status: IMPLEMENTATION SPECIFICATION, not an executed crawl. No products are verified by this document.

## Objective
Discover 1,000 DISTINCT AliExpress product IDs as **candidates**, not fabricate 1,000 approved opportunities. Start with GR and support per-country market/destination settings. Discover demand gaps first, then supply; keep SocialMarket data strictly excluded.

## Rules (versioned, configurable)
- Product listed price >= EUR 50, preferred EUR 80–100,000; compare prices after FX, VAT, shipping, duties and SKU variation.
- Admission routes: **scarcity** (insufficient functionally equivalent local supply) OR **price gap** (lowest credible Greek comparable offer >= 1.5 × delivered AliExpress cost).
- Independently verify demand signal, exact AliExpress offer/variant, destination-specific EU warehouse, seller trust, safety/compliance and working affiliate tracking before publication.
- Quality score >= 80/100 *and* every required verification gate passes. Missing evidence = PENDING, not PASS.
- Existing README describes commission >= EUR 10 as the only deterministic promotion gate. This is a **policy conflict**: reconcile in code only after product-owner confirmation; never silently assert implementation.

## Candidate acquisition (batch target 1,000)
1. Enumerate >= 40 demand-gap clusters per destination country, grounded in queries, forums, trends and local marketplace signals; store source URL, observed timestamp, confidence and evidence text.
2. Generate AliExpress query variants from unmet jobs-to-be-done; page through **official authenticated AliExpress Affiliate API**, with rate limits, retries, checkpointing and signed requests executed server-side only.
3. Normalize product ID, seller ID, variant/SKU, offer currency, price, warehouse, destination, shipping quote, review counts, affiliate link and retrieval timestamp. Do not infer missing fields.
4. Deduplicate by AliExpress product ID and distinguish variant offers. Target 1,000 unique candidate IDs; report achieved count if fewer.
5. For each candidate, find local exact-SKU and functionally equivalent offers. Match specifications, warranties, taxes and shipping; avoid fake price gaps due to non-comparable bundles.
6. Run seller 360, EU warehouse and safety checks; retain REJECTED/PENDING as audit evidence, publish only VERIFIED.

## Neural retrieval
- Postgres + pgvector in isolated `axi` schema / separate project; **never read SocialMarket tables**.
- Tables: `demand_signals`, `niche_clusters`, `products`, `offers`, `local_comparables`, `merchant_evidence`, `source_documents`, `embeddings`, `graph_edges`, `decisions`, `runs`.
- Source documents include provenance, capture time, country, language, consent/licensing restrictions and freshness TTL.
- Multilingual embeddings + lexical full-text hybrid retrieval, reranking, evidence citations and contradiction detection.
- GraphRAG nodes: pain point, country, niche, product, SKU, seller, warehouse, local comparable, regulation; edges: solves, ships_from, sold_by, equivalent_to, observed_in, blocked_by.
- Agent roles: Demand Scout → Scarcity Skeptic → AliExpress Sourcing → Merchant & Compliance → Pricing Comparator → Independent Auditor.
- LLM proposes judgments; deterministic math validates numerical gaps and data completeness; agents cannot turn unknown into verified.
- Scheduled rechecks invalidate stale prices, seller reputation, shipping claims and affiliate links.

## Acceptance tests
- Import zero SocialMarket products.
- Unique candidate IDs count is measured, never hardcoded.
- A product with unknown EU warehouse or no real affiliate URL cannot be VERIFIED.
- Greek price EUR 150, delivered AliExpress price EUR 100 passes the numerical 50%-markup test; EUR 149 does not.
- Same SKU with different variants is not silently merged for pricing.
- Every published product has independently traceable evidence, country, time, source, merchant and risk assessment.
- Logs redact API secrets and customer data; server-only credentials, RLS, least privilege.

## Output
Dashboard: candidates collected / deduplicated / researched / rejected / pending / verified; top demand gaps by country; exact-SKU comparisons; delivered cost and price gap; merchant confidence; agent evidence and timestamps; estimated commissions.

**Execution prerequisites:** functioning signed AliExpress API access, destination-specific offers and a connected isolated database. Until these exist, 1,000 candidates is a target, not a completed result.
