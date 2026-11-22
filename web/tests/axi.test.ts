import { test } from "node:test";
import assert from "node:assert/strict";
import { safeAxiUrl, price, type AxiProduct } from "../lib/axi.ts";
test("affiliate destinations reject deceptive hosts, credentials and scripts", () => {
  for (const url of [
    "javascript:alert(1)",
    "https://s.click.aliexpress.com.evil.test/e/abc",
    "https://user@s.click.aliexpress.com/e/abc",
    "http://s.click.aliexpress.com/e/abc",
    "https://s.click.aliexpress.com:8443/e/abc",
    "https://www.aliexpress.com/item/123.html",
  ])
    assert.equal(safeAxiUrl(url, "affiliate"), null);
  assert.equal(
    safeAxiUrl("https://s.click.aliexpress.com/e/_abc", "affiliate"),
    "https://s.click.aliexpress.com/e/_abc",
  );
});
test("media allowlist accepts source CDN, rejects suffix tricks", () => {
  assert.ok(
    safeAxiUrl("https://ae-pic-a1.aliexpress-media.com/kf/photo.jpg", "image"),
  );
  assert.equal(safeAxiUrl("https://evil-alicdn.com/photo.jpg", "image"), null);
});
test("unknown and invalid prices never become zero-euro offers", () => {
  for (const value of [null, "invalid", 0, -2])
    assert.equal(price({ listed_eur: value } as AxiProduct), "Τιμή άγνωστη");
  assert.match(price({ listed_eur: "91.07" } as AxiProduct), /91,07/);
});
