# FOUND / AXI live integration checkpoint — 2026-11-22

## Confirmed live
- Supabase project VMDB, private schema `axi` (separate from SocialMarket).
- Signed AliExpress Affiliate API query via existing Supabase Vault secrets; HTTP 200.
- Private database function `axi.ingest_aliexpress_page(keywords,page,page_size)` ingests genuine API response products and raw offer evidence.
- 1,038 unique real AliExpress product IDs, 1,063 offer rows; 896 listed offer prices >= EUR 50 (NOT delivered prices).
- 1,038 catalog source documents, 1,038 product-to-query graph edges.
- `axi.retrieve_documents` full-text search works; `axi.retrieve_vectors` installed but requires embedding population.

## Explicit limitations / blockers
- No 1,000 verified opportunities: 0 fully qualified decisions.
- Price is listing price, not final GR-delivered total; EU warehouse, seller, local comparables, exact SKU and compliance not verified.
- Documents are catalog metadata, not independent Greek demand signals. Graph edges mean discovered-under-query, not verified demand relationships.
- 0 embeddings; neural semantic retrieval cannot yet return evidence.
- The live database ingestion function is private/admin-only. Do not expose Vault secrets to clients.
- Python SDK-compatible connector exists on branch feat/axi-neural-rag-discovery-20261122, but the live API smoke test ran through signed PostgreSQL HTTP rather than that Python module. Python module still needs integration testing.
- Automatic schedule is NOT yet configured; ingestion was manually executed.
- Next: secure worker integration, paginated multi-query schedule, country shipping verification, verified SKU/warehouse, affiliate link generation, demand evidence and real comparable price sourcing, embeddings provider and indexing, review gates.
