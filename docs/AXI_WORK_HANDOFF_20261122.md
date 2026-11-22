# AXI / FOUND — WORK CONTINUATION HANDOFF (2026-11-22)

## Exact target
- Repository: https://github.com/vmoulakakis/ai_aliexpress
- Active implementation branch: `feat/axi-neural-rag-discovery-20261122` (NOT merged).
- Existing draft PR: https://github.com/vmoulakakis/ai_aliexpress/pull/12 (verify current head before continuing).
- Vercel project: `axizei-proof-commerce`, ID `prj_2d5SjTjxtp6H3ISB3h9bdXviKRuQ`; team `team_jt3jd1HJUB4sK1oZdl9MUYGs`.
- Supabase VMDB project: `gqpbskssrvpfjtujwezc`; private isolated schema `axi`; DO NOT access or mix SocialMarket data.
- Canonical agent control-plane: `vmoulakakis/Myagenticteam`. Read live governance before edits; use `AGENTS.md`, ADLC and ECC gates.

## Implemented in this conversation
1. `web/app/catalog/page.tsx`: catalog of real marketplace API products with explicit affiliate disclosure, price uncertainty and safe affiliate domain handling. Commit `ec968232b66a3bdea9aabbda6557e59a3ea34bf7`.
2. `web/app/opportunities/page.tsx` and `opportunities.css`: evidence-first infographic of problem clusters, counts, listed-price coverage and affiliate URL shape coverage, each cluster linked to AXI problem-led discovery. Uses existing `getMarketplaceData()` endpoint, no fake AI results.
3. Previous preview deployment `dpl_J7cA9ZDHfSSkp7y2j67s6sHdfhzD` reached READY on commit `ec968232...`; the new infographic commits are NOT in that deployment until a new deployment is created.
4. No production deployment or merge authorized by this handoff alone.

## Data state last verified (NOT current live counts)
- `axi.products`: 1,038 distinct genuine AliExpress product IDs.
- `axi.offers`: 1,063, of which 896 have listed price >= EUR 50, not Greece-delivered price.
- `axi.embeddings`: 0; `axi.decisions` VERIFIED: 0.
- Raw AliExpress API `evaluate_rate` exists on 291 offer rows / 281 products; reported sales on 1,038 products. No actual review texts in `axi.review_evidence`.
- Earlier affiliate generation checkpoint: 394 of 1,038 had API-issued links, not full redirect/commission verification. Recount from live DB; do not repeat old counts as current.
- AliExpress anti-bot challenge blocked direct HTML review scraping. Never fabricate reviews or bypass access controls.
- SDK HMAC-SHA256 signing, key in Vault; never print or commit API secret.

## Product requirements
- Genuine unique AliExpress products >= EUR 50; ideal 80–100,000 EUR.
- Greece price gap >= 50% must be proven against exact comparable SKU and all-in delivered cost, never inferred from listed price.
- Verified affiliate links with redirect, product identity, tracking ID `share1000` and commission eligibility; affiliate issuance alone is not sufficient.
- AI agent should solve customer problems, not merely browse generic categories.
- Infographic must show problem → solution → evidence → economics → decision, with actual provenance, freshness, missingness and confidence. Avoid pretending deterministic grouping is AI.
- User wants premium visual design, mobile UX, dynamic category intelligence, 360 product profile, reviews, price history, 3 real alternatives per family, RAG/GraphRAG with embeddings and verification.
- Free-first. No invented ratings, demand, savings, price history or compliance.

## Critical engineering next steps for Work
1. Inspect HEAD, branch/PR, repo governance, CI, existing AXI backend, Vercel preview, and live Supabase `axi` schema. Reconcile existing `marketplace-products` endpoint: it may represent a different marketplace dataset, not the private `axi` dataset. Current infographic therefore shows **API-visible sample only**, not all 1,038 AXI rows.
2. Build a safe read-only API projection of `axi` (service role server-side only; strict validation, pagination, rate limits). No client Vault exposure. Replace the infographic's marketplace sample with the intended AXI dataset once verified.
3. Build **genuine AI taxonomy**: model-based multi-label problem / user job / mechanism / target persona classification, confidence, taxonomy version, evidence provenance, human-review queue; deterministic fallback clearly labeled. Persist classifications to `axi` with idempotent migration and RLS.
4. Reconcile affiliate links and run a bounded URL/redirect audit; avoid claiming commission validation without evidence.
5. Add test fixtures, accessibility tests, responsive browser QA, build, security and error-state checks. Verify data labels.
6. Open/update draft PR; deploy preview and inspect; production merge/deploy only after explicit review gates.

## UI routes
- `/catalog` — live product catalog.
- `/opportunities` — infographic / problem clusters.
- `/discover` — existing AXI agent experience.
- `/eu/gr/product/[id]` — existing product detail (currently driven by marketplace API).

## Precise status
- GitHub code saved: YES on feature branch.
- Latest infographic build / browser tests: NOT RUN in this chat.
- Infographic preview deployment: NOT YET DEPLOYED.
- Production release: NOT DONE.
- Data/API integration with private `axi` schema: NOT DONE.
- Actual model-generated category classification: NOT DONE.

## Work handoff prompt
Continue `vmoulakakis/ai_aliexpress` on branch `feat/axi-neural-rag-discovery-20261122` using MyAgenticTeam + vassilis-ecc-core. Read `docs/AXI_WORK_HANDOFF_20261122.md`, `AGENTS.md` and relevant skills. Inspect current code/DB/deployments. First run build/tests and deploy a preview of `/opportunities`; then replace field grouping with real versioned AI semantic problem taxonomy backed by isolated Supabase `axi`, preserving evidence provenance and avoiding fake verification. Reconcile affiliate links, test end-to-end, maintain draft PR, report actual evidence and blockers. Do not merge to production without review.
