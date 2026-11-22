# FOUND. — Agent-First Design Contract
Version: 2026-11-22 / agent-first redesign

## Product job
Visitor describes a real-life problem; AI asks only material follow-ups, searches existing product intelligence, and returns grounded solutions with explicit unknowns.

## Visual thesis
HorizonX-influenced *principles*, not a copied template: editorial typography, restrained kinetic geometry, high-contrast consultant workspace, generous whitespace, purposeful cards. Original styling and components; no licensed HorizonX assets imported.
Typography: Georgia (editorial) and system UI/Inter fallback (utilities), both supporting Greek.
Tokens: cream #f1f0e8, ink #131a1a, deep forest #172320, bright lime #c9ed78, muted grey #67716d, border #d2d5cb.
Primary element: orbital intelligence visual paired with a functional agent console.

## Interaction state matrix
- Initial: four question starters, editable free-text prompt.
- Submitting: disabled submit, live waiting state; no fake progress or fake worker status.
- AI configured: server queries real marketplace records and calls an LLM, returns validated product IDs.
- AI unconfigured/provider error: explicit error, retry possible; no pretend recommendations.
- Matched products: direct link to existing /product/[id], evidence caution.
- No matching products: honest explanation or single clarification.
- Premium: publish only if all verification fields are explicitly true; empty state otherwise.
- Emerging: date-derived from first-seen; do not imply product launch date.
- Mobile: single-column responsive, 44px+ interactive targets, keyboard Enter submits/Shift+Enter newline.

## Security and shipping
LLM key server-side only: GAP_AGENT_API_KEY, GAP_AGENT_BASE_URL (DeepSeek/OpenAI allowlist), GAP_AGENT_MODEL. Never NEXT_PUBLIC secrets.
No production LLM activation without rate limiting, budget and abuse controls. Existing internal Supabase gateways must not be made public.
Product claims remain source-grounded and conditional. Affiliate ranking is not commission-biased.
