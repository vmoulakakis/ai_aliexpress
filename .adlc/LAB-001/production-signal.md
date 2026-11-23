# LAB-001 — deployment and probes

State: PREVIEW VERIFIED; not promoted to production. Draft review: https://github.com/vmoulakakis/ai_aliexpress/pull/14 . Main remains at e65fbd6572691e4fe9cbc5325a5da5c03a6ec0ce.

## Runtime evidence
- Successful preview: dpl_7vvWTLNgyNqUCdHM42vuG213wCag, source 64c87f2c3613a9817cb91342be258dd52e398fa4, READY.
- URL: https://axizei-proof-commerce-dne61sdc2-vassilis-projects-3bf8541b.vercel.app/lab .
- Initial deployment dpl_MU7smBqgrge1pN63gLnbWjkEnffV failed because deployment root `web` combined with inherited `npm --prefix web install`, resolving `web/web/package.json`. Fixed per-deployment root to repository root; no production configuration changed.
- Connected Chrome: rendered desktop hero and generated Robotics plan. Default subtotal 3330 EUR, reserve 499.50, total 3829.50.
- Reusing existing training compute: total 954.50. Edited arm allowance 650 to 800 with full training compute: total 4002.
- Save, page reload and restore preserved the edited 4002 plan.
- Comparison opened with header plus three data rows.
- Budget 100 produced 3902 overage for the edited plan.
- Unsupported query produced explicit no-match. Greek vision query selected Vision AI and generated total 1506.50.
- Narrow viewport override 390x844: document client width and scroll width both 380; no page overflow. Visual inspection passed. Override reset afterward.
- Captured page console errors: none.

## Verification
TypeScript passed, production build passed for all existing routes plus `/lab`, seven planner tests passed, scoped strict UI audit passed with zero findings. CSV content and formula protection tested at unit level. Clipboard denial, storage denial and reduced-motion emulation were not exercised in browser; code supplies recovery/stylesheet paths. No physical equipment test, live stock, vendor quote, affiliate tracking, LLM call or production health claim.

A final small accessibility patch associates invalid goal/budget/reserve errors with the actual field; it requires a refreshed preview before final handoff. Runtime evidence above is explicitly bound to the first successful preview commit.
