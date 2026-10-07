#!/usr/bin/env python3
"""Cào danh sách + chi tiết sản phẩm Tiki (API công khai v2), cache thô vào raw/.

Chạy:
  python crawl.py --probe                      # 1-2 request kiểm tra truy cập
  python crawl.py                              # cào tất cả danh mục trong config.json
  python crawl.py --categories ao-len-nu --target 50
Chạy lại an toàn: response đã cache không bị gọi lại. Bị 403/429/captcha/proxy từ chối => dừng.
"""
from __future__ import annotations

import argparse
import hashlib
import sys

from tqdm import tqdm

from common import Blocked, Fetcher, Paths, add_workdir_arg, load_json, save_json, DATA_DIR


def qhash(q: str) -> str:
    return hashlib.sha1(q.encode("utf-8")).hexdigest()[:10]


def list_page(f: Fetcher, cfg: dict, base: str, cat: dict, query: str, page: int) -> dict | None:
    cache = f.paths.raw / "list" / cat["slug"] / f"{qhash(query)}_p{page}.json"
    cached = load_json(cache)
    if cached is not None:
        return cached
    params = {"limit": cfg["page_size"], "q": query, "page": page, "aggregations": 2}
    if cat.get("tiki_category_id"):
        params["category"] = cat["tiki_category_id"]
    r = f.get(base + cfg["list_endpoint"], params=params)
    if r is None:
        return None
    data = r.json()
    data["_query"] = query
    save_json(cache, data)
    return data


def fetch_detail(f: Fetcher, cfg: dict, base: str, pid: str, spid: str | None) -> dict | None:
    cache = f.paths.raw / "detail" / f"{pid}.json"
    cached = load_json(cache)
    if cached is not None:
        return cached
    params = {"platform": "web"}
    if spid:
        params["spid"] = spid
    r = f.get(base + cfg["detail_endpoint"].format(id=pid), params=params)
    if r is None:
        data = {"_missing": True, "id": pid}
    else:
        data = r.json()
        if not isinstance(data, dict) or "id" not in data:
            data = {"_missing": True, "id": pid, "_note": "response không có id"}
    save_json(cache, data)
    return data


def collect_candidates(f, cfg, base, cat, target, max_pages, taken: set[str]) -> list[dict]:
    """Duyệt các query/trang của 1 danh mục tới khi đủ `target` id chưa thuộc danh mục khác."""
    cands: list[dict] = []
    seen_here: set[str] = set()
    for query in cat["queries"]:
        for page in range(1, max_pages + 1):
            if len(cands) >= target:
                return cands
            data = list_page(f, cfg, base, cat, query, page)
            items = (data or {}).get("data") or []
            if not items:
                break
            for it in items:
                pid = str(it.get("id", ""))
                if not pid or pid in taken or pid in seen_here:
                    continue
                seen_here.add(pid)
                cands.append({"id": pid, "spid": str(it.get("seller_product_id") or "") or None,
                              "query": query, "category": cat["slug"]})
                if len(cands) >= target:
                    break
            paging = (data or {}).get("paging") or {}
            if paging.get("last_page") and page >= int(paging["last_page"]):
                break
    return cands


def probe(f: Fetcher, cfg: dict, base: str) -> int:
    print(f"Probe {base} (tối đa 2 request)")
    try:
        r = f.get(base + cfg["list_endpoint"], params={"limit": 5, "q": "áo len nam", "page": 1})
    except Blocked as e:
        print("BLOCKED:", e)
        return 2
    if r is None:
        print("404 không có dữ liệu")
        return 1
    j = r.json()
    items = j.get("data") or []
    print(f"status={r.status_code} items={len(items)} paging={j.get('paging')}")
    if items:
        it = items[0]
        d = f.get(base + cfg["detail_endpoint"].format(id=it["id"]), params={"platform": "web"})
        print("detail status=", d.status_code if d is not None else None)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    add_workdir_arg(ap)
    ap.add_argument("--config", default=str(DATA_DIR / "config.json"))
    ap.add_argument("--base-url", help="ghi đè base_url (dùng cho mock server)")
    ap.add_argument("--probe", action="store_true", help="chỉ kiểm tra truy cập rồi thoát")
    ap.add_argument("--categories", help="slug danh mục lá, cách nhau bằng dấu phẩy (mặc định: tất cả)")
    ap.add_argument("--target", type=int, help="số sản phẩm/danh mục (mặc định theo config)")
    ap.add_argument("--max-pages", type=int, help="số trang tối đa mỗi query")
    ap.add_argument("--list-only", action="store_true", help="chỉ lấy danh sách, chưa lấy chi tiết")
    args = ap.parse_args()

    cfg = load_json(args.config)
    base = (args.base_url or cfg["base_url"]).rstrip("/")
    paths = Paths(args.workdir)
    f = Fetcher(paths)
    try:
        if args.probe:
            return probe(f, cfg, base)

        target = args.target or cfg["target_per_category"]
        max_pages = args.max_pages or cfg["max_pages_per_query"]
        leaves = [c for c in cfg["categories"] if c.get("queries")]
        if args.categories:
            want = set(args.categories.split(","))
            leaves = [c for c in leaves if c["slug"] in want]

        taken: set[str] = set()
        cand_path = paths.raw / "candidates.json"
        all_cands: dict[str, list] = load_json(cand_path, {})
        for slug, lst in all_cands.items():
            if slug not in {c["slug"] for c in leaves}:
                taken.update(x["id"] for x in lst)

        n_detail = 0
        for cat in leaves:
            cands = collect_candidates(f, cfg, base, cat, target, max_pages, taken)
            taken.update(c["id"] for c in cands)
            all_cands[cat["slug"]] = cands
            save_json(cand_path, all_cands)
            print(f"[{cat['slug']}] {len(cands)} ứng viên từ danh sách", flush=True)
            if args.list_only:
                continue
            for c in tqdm(cands, desc=cat["slug"], unit="sp"):
                fetch_detail(f, cfg, base, c["id"], c["spid"])
                n_detail += 1
        print(f"Xong. request mạng thực tế: {f.n_requests}, detail xử lý: {n_detail}")
        print(f"Log request: {f.log_path}")
        return 0
    except Blocked as e:
        print(f"\nDỪNG: bị chặn - {e}", file=sys.stderr)
        print("Không cố lách. Dữ liệu đã cache vẫn được giữ trong raw/.", file=sys.stderr)
        return 2
    finally:
        f.close()


if __name__ == "__main__":
    sys.exit(main())
