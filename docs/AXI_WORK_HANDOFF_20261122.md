# AXI / FOUND — WORK CONTINUATION HANDOFF
Updated 2026-11-22 after implementation of AXI-20261122-TAXONOMY.

## Exact target
- Repository: https://github.com/vmoulakakis/ai_aliexpress
- Branch: feat/axi-neural-rag-discovery-20261122; draft PR https://github.com/vmoulakakis/ai_aliexpress/pull/12 . Never confuse with main or aliexpress_ai.
- Tested functional revision: 28b3067c260d57b96cde1802b86ba0bccfd842b8. Follow-up includes copy correction and this evidence checkpoint; inspect current HEAD.
- Vercel project axizei-proof-commerce / prj_2d5SjTjxtp6H3ISB3h9bdXviKRuQ, team_jt3jd1HJUB4sK1oZdl9MUYGs.
- Verified preview dpl_5WsXEo4P3LyXWv6oMGb3qGwXDWdq: https://axizei-proof-commerce-3cpu9gajs-vassilis-projects-3bf8541b.vercel.app/opportunities . No production promotion/main merge.
- Supabase VMDB gqpbskssrvpfjtujwezc; private axi schema. No SocialMarket reads or mixed dataset.

## Completed / verified
1. Read-only axi-catalog edge v1 with platform JWT check; bounded service-role-only public.axi_catalog_read RPC. No raw payload/review/Vault projection. Global DB request cap240/minute, strict params, max60/cursor pages. Preview branch has public anon credential in server env AXI_CATALOG_ANON_KEY; never put privileged keys in browser.
2. 1038 genuine unique source products, all now classified by real DeepSeek calls into axi.problem_taxonomy v1 (problem keys + job + mechanism + persona + confidence + bound source document). All PENDING_REVIEW; labels never certify demand/product quality. 12 problem groups, multi-label up to3. Admin-only classifier, disjoint row-locked batches, daily55-attempt cap. This day's cap is exhausted; do not retry further today. Two early invalid batches rolled back, corrected source quoting and summary length handling; all1038 eventually persisted.
3. Fixed display currency source: historical axi.offers.price marked EUR differed >2x from detail EUR in806 offer rows. Preserve raw data. Projection only trusts explicit detail_price_currency=EUR + detail_target_sale_price. 1015 priced products, 737 >=EUR50. Catalog browsing defaults to >=EUR50; these are listing prices, never delivered Greece totals.
4. /opportunities uses AXI aggregates and real AI semantic classification. /catalog supports problem + after cursor. /axi/product/[id] shows correct AXI identity, image, price, job/mechanism/persona, source, timestamp, unknowns and affiliate disclosure. No false ratings, savings or scarcity claims.
5. 413 products with API-generated affiliate links using share1000 (394 baseline +19). Three live redirect probes got403; tracking/identity/commission remain unverified. No purchases.
6. Local build/typecheck, 3 Node tests and 8 Python/live tests pass. New edge checks in CI; web PR quality gate runs npm ci/test/build with lockfile. GitHub CI45064215631 and web gate45064215638 succeeded on28b3067. Desktop/mobile browser rendering and map→filtered catalog checked; AXI detail observed, affiliate rels inspected. See .adlc/AXI-20261122-TAXONOMY/production-signal.md.

## Current data and cost limits
- 1038 classifications, 0 VERIFIED commerce decisions, 0 embeddings.
- 55 model attempts; successful-call recorded tokens115849 prompt +127841 completion, excludes failed-call usage. No invoice/total-cost claim.
- Review provider last checkpoint:5 private snapshots, no publication. User quota100/day, scheduler target<=90; two pre-ledger calls existed. No review API calls in this continuation. Do not expose the shared key; rotate via secure management when possible.
- Existing private AXI base tables/functions were created before these new tracked migrations. Additive migrations assume that existing schema; this is not a complete new-project DB bootstrap.

## Next work, in order
1. Review this preview/PR. Main merge and production promotion require actual review; handoff alone does not authorize them.
2. Connect /discover and /api/agent to AXI. They currently use the PREVIOUS marketplace data path. Do not claim the entire agent flow is now AXI grounded. Keep bounded inference/quotas, source IDs, no fabricated answers; add evaluations.
3. Populate multilingual embeddings/hybrid retrieval in isolated axi, then independent Greek demand and SKU-matched local comparable evidence. Current graph edges mean discovery-query relation, not demand proof.
4. Verify exact SKU, destination GR warehouse/shipping/final taxes, seller quality, compliance, returns and authentic reviews. API titles are seller assertions, not certifications. Source prices need TTL/rechecks and cross-field currency reconciliation, not destructive replacement.
5. Complete remaining affiliate issuance with bounded retries and failed-ID ledger; do not loop over permanently unavailable IDs. Audit redirect/product identity/tracking separately; API issuance is not commission verification.
6. Build actual spec-aware equivalent-family matching/top3; current earlier product_families are provisional title-prefix groups and must not imply equivalence.
7. Create permitted review normalizer/quota-safe scheduler only after provider terms/reset details and secret handling are checked. No invented review text or historical price chart.

## Governance / rollback
Read AGENTS.md, DESIGN.md, .agents/skills/universal-creation-orchestrator/SKILL.md and relevant local ADLC/reliability contracts. Keep source in this repo/branch. No secrets in commits. Rollback UI by reverting feature revision; revoke service RPC/deactivate new edge if needed. Private additive taxonomy can remain as audit evidence. No main/production deployment was performed.

Visual QA note: media and catalog title for sample1005013174195632 appear inconsistent (handheld meter image versus proximity sensor title). Do not treat real source image as SKU identity verification. Detail UI explicitly labels seller-image/SKU identity unverified; this candidate requires manual review.
