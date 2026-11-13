---
name: ai-pipeline-reliability
description: Debug, safely repair and verify failed or misleadingly green GitHub Actions, Supabase/Vercel gateways, AI inference, Greek demand harvesting and AliExpress ingestion in this repository.
version: 1.0.0
scope: vmoulakakis/ai_aliexpress
reviewed: 2026-11-13
---

# AI Pipeline Reliability & Recovery

## Activation
Use for GitHub Actions failures, schedules, ingestion stalls, expired or missing credentials, API integration problems, partial AI outputs, data-quality regressions and incident recovery. Read `AGENTS.md` and `skills/agentic-development-lifecycle/SKILL.md` first. Keep the existing MyAgenticTeam orchestrator: this skill is a specialist, not a replacement.

## Incident workflow
1. **Reproduce the *exact* failure**. Record repository, workflow name, run ID, attempt, job ID, commit SHA, branch, trigger, timestamps and failing step. A rerun of an old run uses the OLD commit; a new dispatch is required to test the latest main.
2. **Inspect the real logs**. Capture the first fatal exception and preceding cause. Distinguish runner/bootstrap, Docker/SearXNG, networking, LLM inference, product sourcing, database writes and postprocessing. Warnings and error events within otherwise green steps must be investigated.
3. **Map the request path**. Identify caller worker → GitHub OIDC → Supabase Edge Function or Vercel bridge → PostgREST/provider API → expected response and persistence. For each boundary, check actual URL, HTTP status, content type, response schema and bounded error details. Never log tokens, customer data or private prompts.
4. **Validate authorization *without bypassing it***. Check OIDC issuer, audience, repository ID, workflow ref, main ref and intended permissions. Compare all actual `db_call` resources with deployed `ALLOWED_TABLES`, PostgreSQL tables/views, PostgREST exposure, role grants and RLS. A 401 `table_not_allowed` is not evidence of a missing API key.
5. **Validate the inference provider**. Confirm the endpoint is currently supported, the repository has the required secret, the provider is authorized, the model exists, rate limits allow the run, and its returned shape is valid. `GITHUB_TOKEN` and `models: read` must never be assumed to provide usable inference. The current backend implementation uses `OPENAI_API_KEY`; treat an empty key as BLOCKED, not a silent empty AI response. Do not silently replace the provider with a billable one.
6. **Reject silent/partial successes**. Search for `*_error`, exceptions caught and swallowed, `errors > 0`, empty expected outputs and skipped steps. Classify every stage explicitly: VERIFIED_SUCCESS, PARTIAL, EMPTY, FAILED or BLOCKED. An exit code of zero is insufficient to claim actual AI assessments or conversions.
7. **Apply minimal, reviewable changes**. Preserve repo identity, existing affiliate tracking URLs, data provenance, idempotent upserts, schedules and least privilege. Use bounded retries with jitter only for timeouts, 429 and transient 5xx; never loop on 401/403/invalid schema. Do not open wildcard data permissions.
8. **Verify**. Run targeted static checks, small deterministic mocked tests, guarded gateway probes and one-topic/low-cost canary when credentials and authorization exist. Dispatch a *new* run at the changed commit and inspect steps, error counts and write results. Never describe a compile-only CI as production GREEN.
9. **Document evidence**. Report baseline, exact cause, changed files, commits, verified test run IDs, deployed version, unmet dependencies, remaining risks and rollback reference. Missing live telemetry means UNVERIFIED.

## Acceptance gates for a healthy end-to-end cycle
- Demand evidence retrieved and recorded; assessments are actually generated when eligible documents exist.
- Query hypotheses and forecasts are real, valid structured outputs, not error placeholders.
- Candidate sourcing reports positive stored results when the source returns products.
- Promotion eligibility, enrichment and judging complete with explicit counts and errors.
- The database is checked for expected records and deduplication; never invent product counts or claim sales.
- Track per-stage request count, model cost estimate, 429/401/5xx counts and latest successful run.
- Test budget caps and data integrity before broad production backfills or retries.

## Known failure signatures (2026-11-13)
- Backend run #112 attempt 1: Supabase returned `401 {"error":"table_not_allowed"}` when `ai_market_evidence_documents` was missing from the deployed gateway allowlist. Resolved by a narrowly scoped allowlist change; validate current deployment before touching it again.
- Run #112 attempt 2: `harvest.py` had an undefined `api_model`; `judge.py` attempted to parse a non-JSON AI response. Check the model endpoint, credentials, response status/content type and error paths first.
- Related workflows: Vercel `/api/internal/ai-aliexpress-research` emitted `401 Unauthorized` while some workflows still returned success. Diagnose OIDC workflow allowlist, deployment protection, and provider configuration separately.
- A successful `python -m compileall` cannot catch undefined names or prove AI inference.

## Safety and operations
No secret exfiltration, publicizing auth values, cross-project changes, destructive SQL, wholesale product reimports or substantial model spend without approval. Do not change affiliate URLs. Prefer an isolated canary and rollback-ready commit. The definitive source is measured production behavior, not agent confidence.
