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

### Agentic Commerce Backend inference

The workflow selects `openai` by default. Set the repository Actions variable
`LLM_PROVIDER` to `openai` or `deepseek`, and optionally set
`LLM_FALLBACK_PROVIDER` to the other provider. Use only credentials authorized
for this backend and the data it sends. Set the corresponding Actions secret
`OPENAI_API_KEY` or `DEEPSEEK_API_KEY` through GitHub's secret settings.
The workflow checks credential format locally. Provider authorization, quota,
and model availability are determined by the provider during inference.

OpenAI routes evidence classification to GPT-4.1 nano and analysis to GPT-4.1
mini. DeepSeek uses `deepseek-v4-flash`. The primary route model overrides are listed
in `.env.example`. Local processes can also set a provider-specific override
by prefixing the override name with `LLM_OPENAI_` or `LLM_DEEPSEEK_`.

Each workflow attempt shares a 12 million estimated-token budget by default.
`LLM_TOTAL_TOKEN_BUDGET` sets that cap, and `LLM_MAX_INPUT_TOKENS` limits an
individual prompt estimate. Estimates use UTF-8 bytes plus framing, and each
attempt reserves the route's output allowance before sending. Retries and
fallbacks consume the same budget. Local CLI runs use a per-process budget
unless pointed at a shared SQLite ledger through `LLM_BUDGET_FILE`. Identical
successful requests are cached in memory per process, up to `LLM_CACHE_SIZE`
entries. `LLM_RETRIES` sets the number of retries on the same provider after
transient failures, and the fallback is opt-in.

Run the mock integration suite with
`python -m unittest discover -s tests -v` after installing `requirements.txt`.
