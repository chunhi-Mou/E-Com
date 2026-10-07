"""CLI demo of the multimodal search pipeline (text, voice, image, order).

    python main.py                       run the four sample queries
    python main.py --text "áo mùa đông"
    python main.py --voice "show me black running shoes"
    python main.py --image eval/query_images/black_sweater.jpg [--text "..."]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from container import PROFILES, Settings, build_container
from presentation.search_ui import SearchUI

ROOT = Path(__file__).resolve().parent
SAMPLE_IMAGE = ROOT / "eval" / "query_images" / "navy_sweater.jpg"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--text")
    ap.add_argument("--voice")
    ap.add_argument("--image")
    ap.add_argument("--order", help='order question, e.g. "where is my latest order?"')
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--profile", choices=sorted(PROFILES), default=None)
    args = ap.parse_args()

    settings = Settings.from_env()
    if args.profile:
        settings.profile = args.profile
    ui = SearchUI(build_container(settings).orchestrator)

    if not any([args.text, args.voice, args.image, args.order]):
        ui.text("tôi muốn mua áo mùa đông dưới 500 nghìn")
        ui.voice("Show me black running shoes under 2 million dong")
        if SAMPLE_IMAGE.exists():
            ui.image(str(SAMPLE_IMAGE))
        else:
            print(f"(sample image missing: run `python -m tools.make_eval_queries` first: {SAMPLE_IMAGE})")
        ui.order("đơn hàng 20261001 đâu rồi")
        ui.order("where is my latest order?")
        return 0
    if args.text and not args.image:
        ui.text(args.text, args.limit)
    if args.voice:
        ui.voice(args.voice, args.limit)
    if args.image:
        ui.image(args.image, args.text, args.limit)
    if args.order:
        ui.order(args.order)
    return 0


if __name__ == "__main__":
    sys.exit(main())
