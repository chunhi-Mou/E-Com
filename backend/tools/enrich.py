"""Offline LLM enrichment: tags chosen only from the vocabulary.

    python -m tools.enrich --dry-run --limit 3     show prompts, no API call, no file written
    python -m tools.enrich --limit 20              enrich 20 products (needs LLM_* env)
    python -m tools.enrich                         all products; re-running resumes from dataset/enrichment.json

Writes dataset/enrichment.json (never products.json):
  {"P000001": {"tags": {"season": [{"value": "winter", "confidence": 0.9}], ...}, "model": "...", "input_hash": "..."}}
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Callable

from application.adapters.cache import atomic_write, sha256_hex
from application.adapters.http import load_dotenv
from application.adapters.llm import OpenAICompatibleLLM
from data.product_repository import DATASET_DIR, JsonProductRepository
from data.vocabulary_repository import JsonVocabularyRepository
from domain.models import Product, Vocabulary

ROOT = Path(__file__).resolve().parent.parent


def tag_codes(vocab: Vocabulary) -> list[str]:
    """Tag attributes are the soft (non hard-filterable) ones: season, occasion, style, warmth, ..."""
    return [c for c, a in vocab.attributes.items() if not a.is_hard_filterable]


def system_prompt(vocab: Vocabulary) -> str:
    lines = "\n".join(f"- {c}: " + ", ".join(f"{vc}={v.label}" for vc, v in vocab.attributes[c].values.items())
                      for c in tag_codes(vocab))
    return ("You label e-commerce products with search tags. Reply with one JSON object:\n"
            '{"tags": {"<attribute_code>": [{"value": "<value_code>", "confidence": 0.0-1.0}]}}\n'
            "Use ONLY the attribute codes and value codes listed below; omit an attribute if unsure. "
            "Confidence is how sure you are the product fits the tag.\n" + lines)


def user_prompt(p: Product, category_path: list[str]) -> str:
    return (f"name: {p.name}\ncategory: {' > '.join(category_path)}\nbrand: {p.brand or ''}\n"
            f"description: {p.description}\nattributes: {json.dumps(p.attributes, ensure_ascii=False)}")


def sanitize(raw: Any, vocab: Vocabulary) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    tags = raw.get("tags") if isinstance(raw, dict) else None
    allowed = set(tag_codes(vocab))
    for code, items in (tags.items() if isinstance(tags, dict) else []):
        if code not in allowed or not isinstance(items, list):
            continue
        seen: set[str] = set()
        for it in items:
            val = it.get("value") if isinstance(it, dict) else None
            if val not in vocab.attributes[code].values or val in seen:
                continue
            try:
                conf = min(max(float(it.get("confidence", 0.5)), 0.0), 1.0)
            except (TypeError, ValueError):
                conf = 0.5
            seen.add(val)
            out.setdefault(code, []).append({"value": val, "confidence": round(conf, 2)})
    return out


def enrich_products(products: list[Product], vocab: Vocabulary, llm: OpenAICompatibleLLM | None,
                    existing: dict[str, Any], category_path: Callable[[str], list[str]], model: str,
                    on_progress: Callable[[dict[str, Any]], None] | None = None, dry_run: bool = False,
                    force: bool = False) -> dict[str, int]:
    system = system_prompt(vocab)
    stats = {"done": 0, "cached": 0, "failed": 0, "planned": 0}
    for p in products:
        user = user_prompt(p, category_path(p.category))
        h = sha256_hex(model, system, user)  # changes when the product text, vocabulary or model changes
        prev = existing.get(p.id)
        if prev and prev.get("input_hash") == h and not force:
            stats["cached"] += 1
            continue
        if dry_run or llm is None:
            stats["planned"] += 1
            if dry_run:
                print(f"--- {p.id}\n{user}")
            continue
        try:
            tags = sanitize(llm.chat_json(system, user), vocab)
        except Exception as e:  # keep going; the product stays pending for the next run
            print(f"  {p.id}: failed ({e})", file=sys.stderr)
            stats["failed"] += 1
            continue
        existing[p.id] = {"tags": tags, "model": model, "input_hash": h}
        stats["done"] += 1
        if on_progress:
            on_progress(existing)
    return stats


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset-dir", default=str(DATASET_DIR))
    ap.add_argument("--out", default=None, help="default: <dataset-dir>/enrichment.json")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="ignore cached entries")
    args = ap.parse_args(argv)

    load_dotenv([ROOT / ".env", ROOT.parent / ".env"])
    ds = Path(args.dataset_dir)
    out = Path(args.out) if args.out else ds / "enrichment.json"
    repo = JsonProductRepository(ds)
    vocab = JsonVocabularyRepository(ds).load()
    products = repo.all()[: args.limit] if args.limit else repo.all()

    existing: dict[str, Any] = json.loads(out.read_text(encoding="utf-8")) if out.exists() else {}
    llm, model = None, ""
    if not args.dry_run:
        try:
            llm = OpenAICompatibleLLM.from_env(timeout=60.0)
        except ValueError as e:
            print(f"error: {e}", file=sys.stderr)
            return 2
        model = llm.model
    else:
        model = os.environ.get("LLM_MODEL") or "dry-run"

    def path_names(slug: str) -> list[str]:
        names, cur = [], repo.category(slug)
        while cur:
            names.append(cur.name)
            cur = repo.category(cur.parent) if cur.parent else None
        return list(reversed(names))

    def save(data: dict[str, Any]) -> None:
        atomic_write(out, json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True).encode("utf-8"))

    stats = enrich_products(products, vocab, llm, existing, path_names, model,
                            on_progress=save, dry_run=args.dry_run, force=args.force)
    print(f"products={len(products)} {stats}" + ("" if args.dry_run else f" -> {out}"))
    return 1 if stats["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
