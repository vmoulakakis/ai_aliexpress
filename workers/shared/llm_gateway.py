"""Bounded JSON inference for the Agentic Commerce Backend."""
from collections import OrderedDict
from contextlib import closing
from dataclasses import dataclass, field
import hashlib
import json
import os
import random
import re
import sqlite3
import sys
import time

import requests


# Fixed endpoints keep credentials bound to their provider.
PROVIDERS = {
    "openai": ("https://api.openai.com/v1/chat/completions", "OPENAI_API_KEY",
               "gpt-4.1-nano", "gpt-4.1-mini"),
    "deepseek": ("https://api.deepseek.com/chat/completions", "DEEPSEEK_API_KEY",
                 "deepseek-v4-flash", "deepseek-v4-flash"),
}
ROUTES = {
    "classify": ("DEMAND_AGENT_MODEL", 0, 600),
    "assess": ("DEMAND_ASSESSMENT_MODEL", 1, 2400),
    "queries": ("PRODUCT_SEARCH_MODEL", 1, 2400),
    "forecast": ("HYPOTHESIS_MODEL", 1, 1600),
    "judge": ("OPPORTUNITY_JUDGE_MODEL", 1, 2400),
    "enrich": ("PRODUCT_INTEL_MODEL", 1, 3600),
    "seo": ("PRODUCT_SEO_MODEL", 1, 2400),
}


class GatewayError(RuntimeError):
    pass


@dataclass(frozen=True)
class Provider:
    name: str
    key: str = field(repr=False)


def limit(env, name, default, low, high):
    value = env.get(name) or str(default)
    if not re.fullmatch(r"[0-9]{1,10}", value) or not low <= int(value) <= high:
        raise GatewayError(f"Invalid {name}; expected an integer from {low} to {high}")
    return int(value)


class Gateway:
    def __init__(self, env=None, *, post=None, sleep=time.sleep):
        self.env = os.environ if env is None else env
        primary = self.env.get("LLM_PROVIDER") or "openai"
        fallback = self.env.get("LLM_FALLBACK_PROVIDER") or ""
        names = [primary] + ([fallback] if fallback else [])
        if len(set(names)) != len(names) or any(name not in PROVIDERS for name in names):
            raise GatewayError("Invalid LLM provider selection")
        self.providers = []
        self.unavailable = []
        for name in names:
            key_var = PROVIDERS[name][1]
            key = self.env.get(key_var, "")
            # Offline validation only. The provider verifies authorization on use.
            if (not re.fullmatch(r"sk-[A-Za-z0-9_-]{16,500}", key)
                    or key in {self.env.get("GITHUB_TOKEN"), self.env.get("GH_TOKEN")}):
                self.unavailable.append(key_var)
                continue
            self.providers.append(Provider(name, key))
        if not self.providers:
            raise GatewayError("No configured LLM credential passed offline validation: "
                               + ", ".join(self.unavailable))
        self.models = {
            (name, route): self.configured_model(name, route, primary)
            for name in names for route in ROUTES
        }
        self.max_input = limit(self.env, "LLM_MAX_INPUT_TOKENS", 262144, 1024, 1000000)
        self.total_budget = limit(self.env, "LLM_TOTAL_TOKEN_BUDGET", 12000000, 1024, 1000000000)
        self.remaining = self.total_budget
        self.budget_file = self.env.get("LLM_BUDGET_FILE")
        self.retries = limit(self.env, "LLM_RETRIES", 1, 0, 3)
        self.cache_size = limit(self.env, "LLM_CACHE_SIZE", 128, 0, 512)
        self.cache = OrderedDict()
        self.disabled = set()
        self.post = requests.post if post is None else post
        self.sleep = sleep

    def configured_model(self, name, route, primary):
        var, tier, _ = ROUTES[route]
        override = self.env.get(f"LLM_{name.upper()}_{var}")
        if not override and name == primary:
            override = self.env.get(var)
        if not override:
            return PROVIDERS[name][2 + tier]
        model = override.removeprefix(f"{name}/")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,127}", model):
            raise GatewayError(f"Invalid model override for {name}/{route}")
        return model

    def reserve(self, tokens):
        if not self.budget_file:
            if tokens > self.remaining:
                raise GatewayError("LLM token budget exhausted")
            self.remaining -= tokens
            return
        try:
            with closing(sqlite3.connect(self.budget_file)) as budget, budget:
                budget.execute("CREATE TABLE IF NOT EXISTS budget (id INTEGER PRIMARY KEY, used INTEGER NOT NULL)")
                budget.execute("INSERT OR IGNORE INTO budget VALUES (1, 0)")
                changed = budget.execute(
                    "UPDATE budget SET used = used + ? WHERE id = 1 AND used + ? <= ?",
                    (tokens, tokens, self.total_budget),
                ).rowcount
                if not changed:
                    raise GatewayError("LLM token budget exhausted")
        except sqlite3.Error:
            raise GatewayError("LLM budget state unavailable") from None

    def complete(self, route, system, payload):
        user = json.dumps(payload, ensure_ascii=False, sort_keys=True, allow_nan=False)
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        # Use one token per UTF-8 byte plus framing as a conservative local estimate.
        input_tokens = len(system.encode()) + len(user.encode()) + 64
        if input_tokens > self.max_input:
            raise GatewayError("LLM input exceeds configured token estimate cap")
        output_tokens = ROUTES[route][2]
        digest = hashlib.sha256(json.dumps(messages, ensure_ascii=False).encode()).digest()
        failures = []
        for provider in self.providers:
            name = provider.name
            model = self.models[name, route]
            key = (name, model, route, digest)
            if key in self.cache:
                self.cache.move_to_end(key)
                return json.loads(self.cache[key]), f"{name}/{model}"
            if name in self.disabled:
                failures.append(f"{name}: unavailable in this process")
                continue
            for attempt in range(self.retries + 1):
                self.reserve(input_tokens + output_tokens)
                result, error, retry, disable = self.request(provider, model, messages, output_tokens)
                if error is None:
                    if self.cache_size:
                        self.cache[key] = json.dumps(result)
                        if len(self.cache) > self.cache_size:
                            self.cache.popitem(last=False)
                    return result, f"{name}/{model}"
                if disable:
                    self.disabled.add(name)
                if not retry or attempt == self.retries:
                    failures.append(f"{name}: {error}")
                    break
                self.sleep((2 ** attempt) + random.uniform(0, 0.25))
        raise GatewayError("LLM inference failed (" + "; ".join(failures) + ")")

    def request(self, provider, model, messages, output_tokens):
        endpoint = PROVIDERS[provider.name][0]
        payload = {"model": model, "messages": messages, "temperature": 0.1,
                   "response_format": {"type": "json_object"}}
        if provider.name == "openai":
            payload["max_completion_tokens"] = output_tokens
        else:
            payload["max_tokens"] = output_tokens
            payload["thinking"] = {"type": "disabled"}
        try:
            response = self.post(
                endpoint,
                headers={"Authorization": f"Bearer {provider.key}"},
                json=payload,
                timeout=(5, 90),
                allow_redirects=False,
            )
        except (requests.Timeout, requests.ConnectionError):
            return None, "transport failure", True, False
        except requests.RequestException:
            return None, "request failure", False, False
        status = response.status_code
        if status != 200:
            if status == 429:
                try:
                    if response.json().get("error", {}).get("code") == "insufficient_quota":
                        return None, "quota exhausted", False, True
                except (ValueError, AttributeError):
                    pass
            return None, f"HTTP {status}", status in {408, 429, 500, 502, 503, 504}, status in {401, 402, 403}
        try:
            if "json" not in response.headers.get("Content-Type", "").lower():
                raise ValueError
            choice = response.json()["choices"][0]
            if choice.get("finish_reason") != "stop":
                raise ValueError
            result = json.loads(choice["message"]["content"])
            if not isinstance(result, dict) or not result:
                raise ValueError
        except (ValueError, TypeError, KeyError, IndexError, AttributeError):
            return None, "invalid JSON completion", False, False
        return result, None, False, False


def main():
    if sys.argv[1:] != ["--check"]:
        raise SystemExit("Usage: llm_gateway.py --check")
    try:
        gateway = Gateway()
    except GatewayError as error:
        raise SystemExit(str(error)) from None
    print("Offline LLM credential validation passed for "
          + ", ".join(provider.name for provider in gateway.providers))
    if gateway.unavailable:
        print("Skipped configured providers with missing or invalid credentials: "
              + ", ".join(gateway.unavailable))


if __name__ == "__main__":
    main()
