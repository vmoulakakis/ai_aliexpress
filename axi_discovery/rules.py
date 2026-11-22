"""Evidence-first admission rules. No model can override missing hard-gate evidence."""
from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import Optional

class Status(str, Enum):
    PENDING = "PENDING"
    REJECTED = "REJECTED"
    VERIFIED = "VERIFIED"

@dataclass(frozen=True)
class Evidence:
    source_url: str
    observed_at: str
    country: str
    verified: bool

@dataclass
class Candidate:
    product_id: str
    sku_id: str
    country: str
    delivered_price_eur: Optional[Decimal] = None
    local_comparable_eur: Optional[Decimal] = None
    scarcity_verified: bool = False
    demand_verified: bool = False
    eu_warehouse_verified: bool = False
    seller_verified: bool = False
    safety_verified: bool = False
    affiliate_url_verified: bool = False
    quality_score: Optional[int] = None
    evidence: list[Evidence] = field(default_factory=list)

def price_gap_ratio(candidate: Candidate) -> Optional[Decimal]:
    if candidate.delivered_price_eur is None or candidate.local_comparable_eur is None:
        return None
    if candidate.delivered_price_eur <= 0:
        return None
    return candidate.local_comparable_eur / candidate.delivered_price_eur

def admission(candidate: Candidate) -> tuple[Status, list[str]]:
    reasons = []
    if not candidate.product_id or not candidate.sku_id:
        reasons.append("missing_exact_product_variant")
    if candidate.delivered_price_eur is None:
        reasons.append("missing_delivered_price")
    elif candidate.delivered_price_eur < Decimal("50"):
        return Status.REJECTED, ["below_minimum_price_50_eur"]
    if not candidate.demand_verified:
        reasons.append("demand_unverified")
    if not candidate.eu_warehouse_verified:
        reasons.append("eu_warehouse_unverified")
    if not candidate.seller_verified:
        reasons.append("merchant_unverified")
    if not candidate.safety_verified:
        reasons.append("compliance_unverified")
    if not candidate.affiliate_url_verified:
        reasons.append("affiliate_link_unverified")
    if candidate.quality_score is None:
        reasons.append("quality_score_missing")
    elif candidate.quality_score < 80:
        return Status.REJECTED, ["quality_score_below_80"]
    gap = price_gap_ratio(candidate)
    if not candidate.scarcity_verified and (gap is None or gap < Decimal("1.5")):
        reasons.append("neither_verified_scarcity_nor_price_gap_50_percent")
    if not any(e.verified and e.source_url and e.country == candidate.country for e in candidate.evidence):
        reasons.append("missing_country_specific_source_evidence")
    return (Status.PENDING, reasons) if reasons else (Status.VERIFIED, [])
