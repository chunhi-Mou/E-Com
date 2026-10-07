"""Offline evaluation with an ablation over search profiles.

    python eval/run_eval.py                  all profiles
    python eval/run_eval.py --config full -v show per-query ranks
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from container import PROFILES, Settings, build_container  # noqa: E402

TEXT_ONLY_PROFILES = {"keyword", "enriched"}  # no parser, no image support


def ranked_ids(container, q: dict, profile: str) -> list[str]:
    needs_more = q["image"] or q["modality"] in ("image", "multimodal") or "expected_order" in q
    if profile in TEXT_ONLY_PROFILES and needs_more:
        return []  # capability not present in this configuration
    image = str(ROOT / q["image"]) if q["image"] else None
    resp = container.orchestrator.search(text=q["text"], image=image, modality=q["modality"], limit=10)
    if "expected_order" in q:
        return [resp.order.order.order_code] if resp.order else []
    return [r.product.id for r in resp.results]


def metrics(ranked: list[str], relevant: set[str]) -> dict[str, float]:
    top = ranked[:10]
    hits = [1 if i in relevant else 0 for i in top]
    first = next((r for r, h in enumerate(hits, start=1) if h), None)
    dcg = sum(h / math.log2(r + 1) for r, h in enumerate(hits, start=1))
    idcg = sum(1 / math.log2(r + 1) for r in range(1, min(len(relevant), 10) + 1))
    return {"s1": float(bool(hits and hits[0])), "p10": sum(hits) / min(10, len(relevant)),
            "ndcg": dcg / idcg if idcg else 0.0, "mrr": 1 / first if first else 0.0}


def run(profile: str, queries: list[dict], verbose: bool, dataset_dir: Path) -> tuple[dict, dict]:
    container = build_container(Settings(profile=profile, dataset_dir=dataset_dir))
    rows, per_group = [], defaultdict(list)
    for q in queries:
        ranked = ranked_ids(container, q, profile)
        m = metrics(ranked, set(q["relevant"]))
        rows.append(m)
        per_group[q["group"]].append(m["s1"])
        if verbose:
            label = q["text"] or q["image"]
            print(f"  {q['id']} [{q['group']:<10}] S@1={int(m['s1'])} MRR={m['mrr']:.2f} {label!r} -> {ranked[:3]}")
    avg = {k: sum(r[k] for r in rows) / len(rows) for k in rows[0]}
    return avg, {g: sum(v) / len(v) for g, v in per_group.items()}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="all", choices=["all", *PROFILES])
    ap.add_argument("--queries", default=str(ROOT / "eval" / "queries.json"))
    ap.add_argument("--dataset-dir", default=str(ROOT / "tests" / "fixtures" / "dataset"),
                    help="catalog the labels in --queries refer to")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    queries = json.loads(Path(args.queries).read_text(encoding="utf-8"))
    profiles = list(PROFILES) if args.config == "all" else [args.config]

    results = {}
    for p in profiles:
        if args.verbose:
            print(f"[{p}]")
        results[p] = run(p, queries, args.verbose, Path(args.dataset_dir))

    groups = sorted({q["group"] for q in queries}, key=[q["group"] for q in queries].index)
    counts = {g: sum(q["group"] == g for q in queries) for g in groups}
    print(f"\n{len(queries)} labeled queries. P@10 is divided by min(10, |relevant|).\n")
    print(f"{'profile':<10} {'Success@1':>9} {'P@10':>6} {'nDCG@10':>8} {'MRR':>6}   what it adds")
    for p, (avg, _) in results.items():
        print(f"{p:<10} {avg['s1']:>9.3f} {avg['p10']:>6.3f} {avg['ndcg']:>8.3f} {avg['mrr']:>6.3f}   {PROFILES[p]}")
    print("\nSuccess@1 by group")
    print(f"{'group':<12} {'n':>3} " + " ".join(f"{p:>9}" for p in profiles))
    for g in groups:
        print(f"{g:<12} {counts[g]:>3} " + " ".join(f"{results[p][1][g]:>9.2f}" for p in profiles))


if __name__ == "__main__":
    main()
