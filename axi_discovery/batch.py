"""Import and deduplicate *real* API response records; never synthesize product IDs."""
import json
from pathlib import Path
from typing import Iterable

def normalize(records: Iterable[dict], limit: int = 1000) -> list[dict]:
    seen = set()
    out = []
    for record in records:
        product_id = str(record.get("product_id") or "").strip()
        if not product_id or not product_id.isdecimal() or product_id in seen:
            continue
        seen.add(product_id)
        out.append({"product_id": product_id, "source": "aliexpress_api",
                    "raw": record, "status": "PENDING"})
        if len(out) >= limit:
            break
    return out

def write_candidates(records: Iterable[dict], destination: str, limit: int = 1000) -> int:
    items = normalize(records, limit)
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    Path(destination).write_text(
        "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in items),
        encoding="utf-8",
    )
    return len(items)
