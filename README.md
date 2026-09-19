# AI AliExpress — Greek Opportunity Intelligence Backend

Backend-only agentic commerce intelligence system.

## Mission

Detect what people in Greece are likely to want over the next 30/60/90 days, identify expensive or scarce local problems, source candidate solutions directly from AliExpress, and let AI agents judge the full commercial opportunity.

## Commercial contract

The **only deterministic promotion gate** is:

```
expected_commission_eur >= 10
```

Seller quality, EU warehouse, shipping, scarcity, reviews, trust, demand, price gap, and conversion potential are AI-evaluated evidence, not hard filters.

## Runtime

- GitHub Actions: scheduled/agent workers
- Supabase VMDB: persistence, evidence, forecasts, decisions
- AliExpress Open Platform: direct product sourcing
- GitHub Models / configurable LLM: agent reasoning
- SearXNG: public-web evidence collection

No frontend is part of this repository.
