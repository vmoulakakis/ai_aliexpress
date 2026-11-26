# FOUND. EUROPE — Final integration contract

Status: integration branch; **not production approved**.

## Source of truth
Existing Next.js app lives in `web/`; root package.json delegates the build there. Do not overwrite `main` with a standalone ZIP. Preserve working catalogue, API contracts, database migrations, deployment settings and historical product IDs.

## Deliverables to integrate
- Final FOUND UX and localized el/en/de/fr experience
- AXI conversational discovery with one coherent failure state
- AliHelper-inspired Shopping Intelligence: local price observations, watchlist, seller and shipping evidence labels; no fabricated histories, alerts or scores
- Heavy-duty mowing/difficult-terrain internal category with SKU and safety evidence
- Product pages, responsive accessibility and GDPR disclosure

## MyAgenticTeam governance
- Free-first. Never invoke billable model APIs simply because credentials exist. Paid calls require separate explicit opt-in and enforced quotas.
- Evidence-backed claims only. No invented price history, scarcity, reviews, affiliate attribution or delivery availability.
- Agent proposing a change cannot independently approve production release.
- Human approval before production promotion.

## Mandatory acceptance gates
1. Compare each source component with existing `web/` routes and data contracts.
2. Install dependencies with pinned lockfile, run TypeScript, unit, integration and Next.js build.
3. Test AXI provider outage, malformed responses, duplicate messages, country selection and no-results UX.
4. Run responsive/keyboard/contrast tests and mobile browser smoke tests.
5. Verify affiliate outbound links are actually tracked; a search URL is not proof of attribution.
6. Preview deploy, verify real API calls, preserve rollback target.
7. Obtain explicit production approval, deploy and verify live domain.

Do not describe this integration plan as evidence that implementation or deployment has passed.