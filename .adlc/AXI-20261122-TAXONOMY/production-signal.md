# AXI-20261122-TAXONOMY
Status: PREVIEW VERIFIED / READY FOR REVIEW, no production promotion.

- Code commit: 28b3067c260d57b96cde1802b86ba0bccfd842b8; draft PR #12.
- Vercel preview: dpl_5WsXEo4P3LyXWv6oMGb3qGwXDWdq READY, https://axizei-proof-commerce-3cpu9gajs-vassilis-projects-3bf8541b.vercel.app/opportunities .
- CI run 45064215631 and web quality gate 45064215638 both SUCCESS on this exact code commit.
- Browser: desktop width 1298/scrollWidth1282; mobile width390/scrollWidth375, no horizontal overflow. Observed map stats 1038 / 1038 / 737 / 0, all 12 problem clusters, filter navigation, 36 cards, real product images and price 91.07 EUR for 1005013174195632. Detail renders source quote, persona, pending review, unknown evidence and sponsored/nofollow link. External purchase not executed.
- Local: 3 Node URL/price tests, 4 discovery tests and 4 opt-in live edge probes passed; Next build and typecheck passed. Anonymous direct RPC denied; unauthenticated edge denied; invalid params rejected; cursor pages disjoint. Security advisors report INFO no-policy on private AXI RLS tables; deny-by-default is intentional, not a public access grant.
- DB: 1038 model classifications, all PENDING_REVIEW. 55 model attempts, 2 rejected output batches; corrected source-bound quote contract and retried missing products within cap. Recorded successful-call tokens:115849 prompt +127841 completion; failed-call token usage not captured, so this is not total billable usage.
- 1015 products with explicit detail EUR price; 737 >=EUR50. Historical offers.price untouched and excluded due currency mismatch. 413 API-generated affiliate links after 19 new links; three redirect probes returned HTTP403, none promoted to verified. 0 verified commerce decisions and 0 embeddings.
- No SocialMarket data read by app or inference. No review-provider calls, review publication, recurring schedule, main merge or production frontend promotion.
