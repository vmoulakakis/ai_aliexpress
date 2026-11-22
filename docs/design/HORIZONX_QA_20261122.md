# FOUND Horizon X redesign — acceptance evidence

Target vmoulakakis/ai_aliexpress; branch feat/axi-horizonx-redesign-20261122; stacked draft PR13 on PR12. Base7710590. Functional preview revision5dc84220c71574e41bc6141a3af0dccca54f14cb. Preview https://axizei-proof-commerce-mu2dilzbz-vassilis-projects-3bf8541b.vercel.app / dpl_CAnNwtCy6d8jtCacxZnRccoqFUPe READY.

## Executed checks
- Next production build and TypeScript: PASS, including new read-only catalog proxy.
- Node tests4/4: safe affiliate/media URLs, unknown-price behavior, Greek need aliases. Discovery unit tests4/4. Opt-in Python live integration4 were SKIPPED in this redesign run; earlier continuity evidence remains separate.
- CI45066875586 and web quality gate45066875487 SUCCESS on5dc8422.
- Independent static QA found3 P2 issues (disclosure contrast, search suggestions, reel focus) and confirmed fixes. Disclosure contrast4.78–5.61:1; four Node tests/typecheck pass. No remaining P1/P2 in focused static follow-up. Reviewer did not perform browser checks; those were performed separately by root.
- Actual home render inspected at1440,1024,768,390,360,320. Measured scrollWidths1425,1009,753,375,345,305 respectively; no horizontal page overflow. Desktop and mobile screenshots inspected through browser.
- Gallery: selected card plus six ArrowRight presses changed counter01/12→07/12 and retained focus on stable .hx-reel. Manual focus controls and correct detail href observed; no autoplay.
- Need search: «υγρά» returns fluid-handling; selecting it performed actual proxy read and rendered3 genuine AXI detail links, aria-busy false. «ζζζζ» displayed honest empty-search recovery. Initial selector ordering refined so default selection is visible on mobile.
- Catalog:36 cards per page, >=EUR50 source scope, filter to inspect-hidden-damage, then card click to /axi/product/1005005443045216 succeeded. Catalog/detail mobile390 had scrollWidth375. Empty catalog after999999999999 displayed recovery and returned to36 cards.
- Detail: real source image/title/price164.99EUR, source document494, source timestamp, interpretation, unknowns and affiliate disclosure observed. Sponsored link host s.click.aliexpress.com, rel sponsored/nofollow/noopener/noreferrer preserved. No external purchase or redirect validation performed.
- Proxy rejects limit99 and unknown table parameter with HTTP400 invalid_parameters. It permits no arbitrary upstream URL/table and performs no inference.
- Browser console on home: no logs/errors reported. Static client chunks contain no AXI_CATALOG_ANON_KEY, service-role key or DeepSeek secret names.

## Limits and release
CSS prefers-reduced-motion fallback reviewed; actual OS/media emulation and native200% zoom were NOT exercised through this browser interface. Touch swipe handler reviewed, not real-device tested. No field Core Web Vitals or full WCAG certification claimed. Upstream provider failure was not injected; source failure/retry is implemented and statically reviewed. Product/seller/warehouse/shipping/affiliate attribution and original data verification limits remain unchanged.

No new runtime dependency, paid asset, paid inference call, database mutation, main merge or production promotion. Original components and inline icons; HorizonX.so used as a visual/interaction reference, not a downloaded commercial template. READY FOR USER VISUAL REVIEW; production approval remains separate.

Local build diagnostic: discovery-specific client chunk31,742bytes raw /10,873bytes gzip. This is a bundle-size observation, not a field loading-speed measurement.
