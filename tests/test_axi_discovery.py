import unittest
from decimal import Decimal
from axi_discovery.batch import normalize
from axi_discovery.rules import Candidate, Evidence, Status, admission, price_gap_ratio

class DiscoveryTests(unittest.TestCase):
    def test_gap_boundary(self):
        c = Candidate("123", "sku", "GR", Decimal("100"), Decimal("150"))
        self.assertEqual(price_gap_ratio(c), Decimal("1.5"))
        c.local_comparable_eur = Decimal("149")
        self.assertLess(price_gap_ratio(c), Decimal("1.5"))

    def test_missing_warehouse_cannot_pass(self):
        c = Candidate("123", "sku", "GR", Decimal("100"), Decimal("150"),
            demand_verified=True, seller_verified=True, safety_verified=True,
            affiliate_url_verified=True, quality_score=95,
            evidence=[Evidence("https://example.com", "2026-11-22", "GR", True)])
        self.assertEqual(admission(c)[0], Status.PENDING)

    def test_below_minimum_rejected(self):
        c = Candidate("123", "sku", "GR", Decimal("49"))
        self.assertEqual(admission(c)[0], Status.REJECTED)

    def test_dedupe_real_ids(self):
        self.assertEqual(len(normalize([{"product_id":"123"}, {"product_id":"123"},
             {"product_id":"invalid"}, {"product_id":"456"}])), 2)

if __name__ == "__main__":
    unittest.main()
