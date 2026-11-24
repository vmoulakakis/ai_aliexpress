import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch

import requests

from workers.agentic_backend import judge
from workers.demand_intelligence import harvest
from workers.product_intelligence import enrich_eligible as enrich
from llm_gateway import Gateway, GatewayError


ROOT = Path(__file__).resolve().parents[1]
OPENAI_KEY = "sk-" + "a" * 32
DEEPSEEK_KEY = "sk-" + "b" * 32
ENV = {"OPENAI_API_KEY": OPENAI_KEY}
FALLBACK = {**ENV, "LLM_FALLBACK_PROVIDER": "deepseek", "DEEPSEEK_API_KEY": DEEPSEEK_KEY}


def response(status=200, result=None, finish="stop"):
    body = {"choices": [{"finish_reason": finish,
                        "message": {"content": json.dumps(result if result is not None else {"ok": True})}}]}
    return Mock(status_code=status, headers={"Content-Type": "application/json"},
                **{"json.return_value": body})


class CommerceLLMTests(unittest.TestCase):
    def setUp(self):
        network = patch.object(requests.sessions.Session, "request",
                               side_effect=AssertionError("network forbidden"))
        network.start()
        self.addCleanup(network.stop)
        self.sleep = Mock()

    def test_credentials_checked_offline_and_secrets_redacted(self):
        for key in ("", "sk-placeholder", OPENAI_KEY + "\n", OPENAI_KEY):
            with self.subTest(key_length=len(key)):
                with self.assertRaisesRegex(GatewayError, "OPENAI_API_KEY") as error:
                    Gateway({"OPENAI_API_KEY": key, "GITHUB_TOKEN": OPENAI_KEY})
                self.assertNotIn(OPENAI_KEY, str(error.exception))
        with self.assertRaisesRegex(GatewayError, "Invalid LLM provider"):
            Gateway({**ENV, "LLM_PROVIDER": "https://example.test"})
        with self.assertRaisesRegex(GatewayError, "Invalid model override"):
            Gateway({**ENV, "PRODUCT_SEARCH_MODEL": "deepseek/deepseek-v4-flash"})
        self.assertNotIn(OPENAI_KEY, repr(Gateway(ENV).providers))

    def test_offline_cli_accepts_only_explicit_fallback(self):
        command = [sys.executable, str(ROOT / "workers/shared/llm_gateway.py"), "--check"]
        blocked = subprocess.run(command, env={"DEEPSEEK_API_KEY": DEEPSEEK_KEY},
                                 capture_output=True, text=True)
        self.assertEqual(blocked.returncode, 1)
        passed = subprocess.run(command, env={"DEEPSEEK_API_KEY": DEEPSEEK_KEY,
                                              "LLM_FALLBACK_PROVIDER": "deepseek"},
                                capture_output=True, text=True)
        self.assertEqual(passed.returncode, 0, passed.stderr)
        self.assertIn("passed for deepseek", passed.stdout)
        self.assertNotIn(DEEPSEEK_KEY, passed.stdout + passed.stderr)

    def test_retry_then_fallback_and_provider_specific_request(self):
        post = Mock(side_effect=[requests.ReadTimeout(OPENAI_KEY), response(503), response()])
        gateway = Gateway(FALLBACK, post=post, sleep=self.sleep)
        self.assertEqual(gateway.complete("classify", "Return JSON", {}), ({"ok": True}, "deepseek/deepseek-v4-flash"))
        self.assertEqual(post.call_count, 3)
        self.sleep.assert_called_once()
        first, _, last = post.call_args_list
        self.assertEqual(first.args[0], "https://api.openai.com/v1/chat/completions")
        self.assertEqual(first.kwargs["json"]["model"], "gpt-4.1-nano")
        self.assertEqual(first.kwargs["json"]["max_completion_tokens"], 600)
        self.assertEqual(last.args[0], "https://api.deepseek.com/chat/completions")
        self.assertEqual(last.kwargs["headers"]["Authorization"], f"Bearer {DEEPSEEK_KEY}")
        self.assertEqual(last.kwargs["json"]["max_tokens"], 600)
        self.assertEqual(last.kwargs["json"]["thinking"], {"type": "disabled"})
        self.assertFalse(last.kwargs["allow_redirects"])

    def test_auth_and_quota_failures_skip_provider_without_retry(self):
        for rejected in (response(401), Mock(status_code=429, **{
                "json.return_value": {"error": {"code": "insufficient_quota"}}})):
            with self.subTest(status=rejected.status_code):
                post = Mock(side_effect=[rejected, response(), response()])
                gateway = Gateway(FALLBACK, post=post, sleep=self.sleep)
                for route in ("classify", "judge"):
                    self.assertEqual(gateway.complete(route, "JSON", {})[1], "deepseek/deepseek-v4-flash")
                self.assertEqual(post.call_count, 3)
        self.sleep.assert_not_called()

    def test_invalid_completion_is_not_cached_retried_or_logged(self):
        for rejected in (response(result=[OPENAI_KEY]), response(finish="length"), response(307)):
            with self.subTest(status=rejected.status_code):
                post = Mock(side_effect=[rejected, response()])
                gateway = Gateway(ENV, post=post, sleep=self.sleep)
                with self.assertRaises(GatewayError) as error:
                    gateway.complete("classify", "JSON", {})
                self.assertNotIn(OPENAI_KEY, str(error.exception))
                self.assertEqual(post.call_count, 1)
                gateway.complete("classify", "JSON", {})
                self.assertEqual(post.call_count, 2)
        self.sleep.assert_not_called()

    def test_budget_counts_failed_attempt_and_cache_hit_is_free(self):
        post = Mock(return_value=response(result={"list": [1]}))
        gateway = Gateway({**ENV, "LLM_TOTAL_TOKEN_BUDGET": "1024", "LLM_MAX_INPUT_TOKENS": "1024"},
                          post=post)
        result, _ = gateway.complete("classify", "JSON", {"a": 1, "b": 2})
        result["list"].append(2)
        self.assertEqual(gateway.complete("classify", "JSON", {"b": 2, "a": 1})[0], {"list": [1]})
        with self.assertRaisesRegex(GatewayError, "input exceeds"):
            gateway.complete("classify", "JSON", {"large": "α" * 600})
        with self.assertRaisesRegex(GatewayError, "budget exhausted"):
            gateway.complete("classify", "JSON", {"new": 1})
        post.assert_called_once()
        retry = Mock(return_value=response(429))
        gateway = Gateway({**FALLBACK, "LLM_TOTAL_TOKEN_BUDGET": "1024"}, post=retry, sleep=self.sleep)
        with self.assertRaisesRegex(GatewayError, "budget exhausted"):
            gateway.complete("classify", "JSON", {})
        retry.assert_called_once()

    def test_workflow_budget_is_shared_by_worker_instances(self):
        post = Mock(return_value=response())
        with TemporaryDirectory() as temp:
            env = {**ENV, "LLM_TOTAL_TOKEN_BUDGET": "1024",
                   "LLM_BUDGET_FILE": str(Path(temp) / "budget.sqlite")}
            Gateway(env, post=post).complete("classify", "JSON", {})
            with self.assertRaisesRegex(GatewayError, "budget exhausted"):
                Gateway(env, post=post).complete("classify", "JSON", {})
        post.assert_called_once()

    def test_demand_worker_classifies_and_assesses_with_mocked_transport(self):
        post = Mock(side_effect=[response(result={"evidence_kind": "market_evidence"}),
                                 response(result={"conversion_opportunity": "high"})])
        gateway = Gateway(ENV, post=post)
        topics = [{"id": "topic-1", "problem_key": "test", "problem_title": "Test"}]
        with patch.object(harvest, "Gateway", return_value=gateway), \
             patch.object(harvest, "topics", return_value=topics), \
             patch.object(harvest, "search", return_value=[{"url": "https://bestprice.gr/a"}]), \
             patch.object(harvest, "db_call", return_value=[{"id": "doc-1"}]) as db:
            harvest.main()
        self.assertEqual([call.args[1] for call in db.call_args_list],
                         ["ai_market_evidence_documents", "ai_greek_gap_assessments"])
        self.assertEqual(db.call_args.kwargs["data"]["evidence_ids"], ["doc-1"])
        self.assertEqual([c.kwargs["json"]["model"] for c in post.call_args_list],
                         ["gpt-4.1-nano", "gpt-4.1-mini"])

    def test_demand_failure_cannot_be_written_as_noise(self):
        gateway = Gateway(ENV, post=Mock(return_value=response(401)))
        with patch.object(harvest, "search", return_value=[{"url": "https://bestprice.gr/a"}]), \
             patch.object(harvest, "db_call") as db, self.assertRaises(GatewayError):
            harvest.collect_topic(gateway, {"id": "topic-1", "problem_title": "Test"})
        db.assert_not_called()

    def test_query_and_forecast_use_fallback_model_provenance(self):
        gateway = Gateway(FALLBACK, post=Mock(side_effect=[
            response(401), response(result={"queries": [{"query": "water pump"}]}),
            response(result={"horizon_30": {"direction": "up"}})]))
        topic = {"id": "topic-1", "problem_key": "test"}
        with patch.object(judge, "db_call", side_effect=lambda method, *args, **kw:
                          [{"id": "signal-1"}] if args[0] == "ai_demand_signals" else []) as db:
            judge.build_queries(gateway, topic)
            judge.forecast(gateway, topic)
        writes = {call.args[1]: call.kwargs["data"] for call in db.call_args_list if call.args[0] == "POST"}
        self.assertEqual(writes["ai_source_queries"]["query_text"], "water pump")
        self.assertEqual(writes["ai_source_queries"]["agent_feedback"]["model_name"], "deepseek/deepseek-v4-flash")
        self.assertEqual(writes["ai_demand_forecasts"]["model_name"], "deepseek/deepseek-v4-flash")
        self.assertEqual(writes["ai_demand_forecasts"]["evidence_ids"], ["signal-1"])

    def test_judge_keeps_existing_evaluations_and_records_new_model(self):
        post = Mock(return_value=response(result={"verdict": "WATCH", "confidence_0_100": 70}))
        gateway = Gateway(ENV, post=post)

        def db_get(method, table, **kwargs):
            if method != "GET":
                return None
            if table == "ai_promotion_candidates_v":
                return [{"product_candidate_id": "old", "offer_id": "1"},
                        {"product_candidate_id": "new", "offer_id": "2"}]
            if table == "ai_product_evaluations" and kwargs["params"]["offer_id"] == "eq.1":
                return [{"id": "existing"}]
            return []

        with patch.object(judge, "db_call", side_effect=db_get) as db:
            judge.judge_products(gateway)
        post.assert_called_once()
        write = db.call_args
        self.assertEqual(write.args, ("POST", "ai_product_evaluations"))
        self.assertEqual(write.kwargs["data"]["product_candidate_id"], "new")
        self.assertEqual(write.kwargs["data"]["verdict"], "WATCH")
        self.assertEqual(write.kwargs["data"]["model_name"], "openai/gpt-4.1-mini")

    def test_enrichment_uses_gateway_and_persists_both_outputs(self):
        post = Mock(side_effect=[response(result={"confidence_0_100": 80}),
                                 response(result={"primary_keyword": "αντλία"})])
        gateway = Gateway(ENV, post=post)
        with patch.object(enrich, "db_call") as db, patch.object(enrich, "ai_json") as legacy:
            enrich.synthesize({"product_candidate_id": "candidate"}, {}, {}, [], [], [], [], {},
                              gateway=gateway)
        legacy.assert_not_called()
        self.assertEqual([call.args[1] for call in db.call_args_list],
                         ["ai_product_intelligence", "ai_product_seo_intelligence"])
        self.assertEqual(db.call_args_list[0].kwargs["data"]["model_name"], "openai/gpt-4.1-mini")
        self.assertEqual(db.call_args.kwargs["data"]["primary_keyword"], "αντλία")
