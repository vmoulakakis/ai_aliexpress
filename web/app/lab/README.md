# FOUND. LAB MVP

Open `/lab`. Choose Local AI, Robotics or Vision AI; choose compute tier and budget; generate a plan. Open source disclosures, edit cost assumptions, compare compute families, save locally, restore or export CSV. Preset sharing intentionally omits private goal text and custom costs.

The MVP is a curated configurator. It does not use an LLM, live supplier inventory, checkout, affiliate tracking or server-side saved projects. Those capabilities are not implied by the UI. Catalog entries include source dates and uncertainty; complete system compatibility has not been tested on physical hardware.

## Run

From `web/`: `npm ci`, `npm run dev`, then open `http://localhost:3000/lab`.

## Verify

```sh
npx tsc --noEmit
npx tsc lib/lab/catalog.ts lib/lab/planner.ts --outDir /tmp/found-lab-test --module commonjs --target es2022 --skipLibCheck
node --test tests/lab/planner.test.cjs
npm run build
```

The unit suite covers input bounds, Greek matching, ambiguity, all six preset/tier combinations, reused training compute, edited allowances, over-budget calculations, CSV sanitization and corrupt browser storage.

Design and behavioral ownership: `web/components/lab/DESIGN.md` and `UX-CONTRACT.md`. Delivery evidence: `.adlc/LAB-001/`.
