# Greek Pain-Gap Demand Intelligence Skill

## Mission
Discover Greek commerce opportunities where a real, monetizable pain is poorly served by local supply and a direct-source product can plausibly convert profitably.

This skill is not a trend hunter and not a generic keyword-volume ranker.

Core thesis:

> High pain + buyer intent + weak/expensive/incomplete Greek supply + credible product solution + viable economics = commerce opportunity.

## Primary Objective
Optimize for conversion probability and realized commission, not raw traffic.

The only deterministic commercial gate remains:

```
expected_commission_per_realistic_sale >= EUR 10
```

All other factors are AI evidence, never hard rejection rules.

## Evidence Priority

### Tier A — Mandatory Greek market evidence
1. BestPrice Greece — mandatory reference when discoverable.
2. Skroutz — exact products, substitutes, pricing, reviews, availability.
3. Greek specialist retailers and professional suppliers.
4. Greek service providers where the product replaces an expensive service or diagnostic visit.

### Tier B — Pain and purchase-intent evidence
1. Google/public web search snippets.
2. Greek forums and Reddit.
3. YouTube/public social evidence.
4. Queries expressing purchase intent:
   - "πού το βρίσκω"
   - "υπάρχει Ελλάδα"
   - "τιμή"
   - "πού αγοράζεται"
   - "αγορά"
   - "επαγγελματικό"

### Tier C — Source-product evidence
1. AliExpress direct API.
2. Observed sales.
3. Reviews/feedback.
4. Seller/shop evidence.
5. Offer price and realistic commission.
6. Shipping/warehouse/fulfillment when available.

## RAG Architecture

### Evidence document
Every retrieved source becomes an evidence document with:
- problem_cluster_id
- source_name / source_family
- source_url
- title/snippet
- query that retrieved it
- evidence_kind
- purchase_intent
- pain_intensity
- exact_solution_evidence
- substitute_evidence
- competition_evidence
- price/availability evidence
- extracted factual claims
- timestamp

### Retrieval
Retrieve recent evidence by problem cluster first.
Use PostgreSQL metadata/FTS retrieval for the free-first implementation.
Embeddings are optional later; they are not required for v1.

### Synthesis
The Gap Assessment Agent synthesizes evidence into:
- lifecycle
- demand state
- pain state
- supply state
- competition state
- exact-match state
- substitute state
- price-gap state
- buyer-intent state
- conversion opportunity
- confidence
- thesis
- counter-thesis
- next evidence actions

## Agentic Team

### 1. Pain Scout
Find expensive recurring Greek problems, not products.

### 2. Buyer Intent Agent
Separate curiosity from purchase intent.

### 3. BestPrice/Skroutz Market Agent
Determine exact local supply, substitutes, price bands, availability and saturation.
BestPrice must be attempted for every candidate problem.

### 4. Specialist Supply Agent
Search Greek B2B/professional suppliers that marketplaces may miss.

### 5. Gap Analyst
Classify the gap:
- price gap
- availability gap
- quality/specification gap
- feature gap
- trust/warranty gap
- service-cost substitution gap
- no meaningful gap

### 6. Product Hunter
Search AliExpress broadly using marketplace vocabulary learned from results.

### 7. Commercial Judge
Combine:
- problem fit
- Greek gap evidence
- seller/product evidence
- fulfillment uncertainty
- realistic commission
- conversion friction
- seasonality
- evidence quality

Decision:
`PROMOTE | WATCH | IGNORE`

## Conversion-First Logic
High search volume can be bad if:
- Greece already has many cheap exact matches,
- margins are thin,
- user can buy instantly from a trusted local retailer.

Low search volume can be excellent if:
- the pain is expensive,
- buyer is professional,
- purchase intent is high,
- local solution is costly or hard to find,
- commission per conversion is large.

Therefore do not build a fixed weighted score.

Use expected commercial value conceptually:

```
P(click)
× P(conversion)
× expected commission
× opportunity duration
× confidence
```

adjusted by competition, trust, logistics, saturation and evidence gaps.

## Lifecycle
`DISCOVERED → EMERGING → RISING → ESTABLISHED → PEAKING → DECLINING`

Lifecycle describes demand maturity, not promotion eligibility.

## Evidence Rules
- Never invent search volume.
- Never infer stock from a generic search result.
- Never fabricate Greek scarcity.
- Do not call something "hard to find in Greece" without exact/substitute market evidence.
- Social virality is not buyer demand.
- A BestPrice/Skroutz listing proves supply, not necessarily strong competition.
- Distinguish exact match from functional substitute.
- Record contradictory evidence.
- Missing evidence lowers confidence; it does not automatically reject.

## Free-First Infrastructure
Default implementation:
- SearXNG for public web discovery.
- GitHub Models for classification/synthesis.
- Supabase PostgreSQL as RAG evidence store.
- PostgreSQL FTS/metadata retrieval.
- AliExpress API through existing TravelAI gateway.

No new paid API is required.

## Optional Enrichment
When available, Google Ads Keyword Planner can provide:
- average monthly searches
- monthly search history
- competition level/index
- bid ranges

Use it as additional evidence, not as the decision-maker.

DataForSEO or similar providers may be used only when higher-resolution trend/SERP data justifies the cost.

## Output Contract
For each problem/product opportunity:

```json
{
  "problem": "...",
  "pain_state": "HIGH",
  "buyer_intent_state": "HIGH",
  "bestprice_exact_matches": "evidence-based",
  "skroutz_exact_matches": "evidence-based",
  "substitute_state": "WEAK",
  "supply_state": "UNDERSERVED",
  "competition_state": "LOW",
  "price_gap_state": "POSITIVE",
  "lifecycle": "RISING",
  "conversion_opportunity": "PROMISING",
  "confidence": 0.82,
  "thesis": "...",
  "counter_thesis": "...",
  "next_actions": []
}
```

## Integration with Affiliate Conversion Skill
After a product passes commercial judgment, the affiliate conversion/content skill handles:
- competitor research
- review sentiment
- pain-to-feature mapping
- authentic pros/cons
- buyer objections
- conversion copy
- link integrity

Demand Intelligence decides whether there is an opportunity.
Conversion Intelligence decides how to sell it.
