"""Minimal AliExpress IOP connector adapted from user-provided SDK signing algorithm.

Never copy the SDK's sample test credentials. Secrets must come from server env.
"""
import hashlib
import hmac
import os
import time
from typing import Mapping

import requests

GATEWAY = "https://api-sg.aliexpress.com/sync"
PARTNER_ID = "iop-sdk-python-20220609"
ALLOWED_METHODS = frozenset({
    "aliexpress.affiliate.product.query",
    "aliexpress.affiliate.link.generate",
})

def sign(secret: str, method: str, params: Mapping[str, str]) -> str:
    """Match supplied SDK: HMAC-SHA256 over sorted key/value concatenation."""
    canonical = (method if "/" in method else "") + "".join(
        str(key) + str(params[key]) for key in sorted(params)
    )
    return hmac.new(secret.encode("utf-8"), canonical.encode("utf-8"),
                    hashlib.sha256).hexdigest().upper()

class AliExpressIOP:
    def __init__(self, app_key: str, app_secret: str, gateway: str = GATEWAY):
        if not app_key or not app_secret:
            raise ValueError("Missing server-side AliExpress credentials")
        if not gateway.startswith("https://"):
            raise ValueError("HTTPS gateway required")
        self.app_key, self._secret, self.gateway = app_key, app_secret, gateway

    @classmethod
    def from_env(cls):
        return cls(os.environ["ALIEXPRESS_APP_KEY"],
                   os.environ["ALIEXPRESS_APP_SECRET"],
                   os.environ.get("ALIEXPRESS_API_GATEWAY", GATEWAY))

    def execute(self, method: str, parameters: Mapping[str, str]) -> dict:
        if method not in ALLOWED_METHODS:
            raise ValueError("Method not allowlisted")
        params = {
            "app_key": self.app_key,
            "sign_method": "sha256",
            "timestamp": str(int(time.time()) * 1000),
            "partner_id": PARTNER_ID,
            "method": method,
            "simplify": "false",
            "format": "json",
        }
        params.update({str(k): str(v) for k, v in parameters.items()})
        params["sign"] = sign(self._secret, method, params)
        response = requests.post(self.gateway, data=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        if str(data.get("code", "0")) != "0":
            raise RuntimeError("AliExpress API error: " + str(data.get("code")))
        return data

    def query_products(self, keywords: str, page: int = 1, page_size: int = 50,
                       country: str = "GR", tracking_id: str = "share1000") -> dict:
        if not 1 <= page_size <= 50 or page < 1:
            raise ValueError("Invalid page/page_size")
        return self.execute("aliexpress.affiliate.product.query", {
            "keywords": keywords, "page_no": str(page), "page_size": str(page_size),
            "target_currency": "EUR", "target_language": "EN",
            "ship_to_country": country, "tracking_id": tracking_id,
        })
