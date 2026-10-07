#!/usr/bin/env python3
"""Raw (raw/detail + raw/candidates.json) -> out/products.json, out/categories.json.

Chạy:
  python normalize.py                       # chuẩn hóa tất cả; images = đường dẫn dự kiến
  python normalize.py --require-images      # sau download_images.py: chỉ giữ sp đã có ảnh thật
Id sản phẩm ổn định qua các lần chạy (out/id_map.json: source_id -> P000123).
"""
from __future__ import annotations

import argparse
import html
import random
import re
import sys
import unicodedata
from collections import Counter
from html.parser import HTMLParser

from common import DATA_DIR, Paths, add_workdir_arg, load_json, save_json

COLORS = ["black", "white", "gray", "beige", "brown", "red", "pink", "orange", "yellow", "green", "blue", "navy", "purple", "silver", "gold", "multicolor"]
MATERIALS = ["cotton", "wool", "polyester", "linen", "denim", "leather", "synthetic_leather", "silk", "fleece", "down", "nylon", "knit", "canvas", "rubber", "metal", "plastic"]
GENDERS = ["male", "female", "unisex", "kids"]
ORDER = {"color": COLORS, "material": MATERIALS, "gender": GENDERS}


# ---------- HTML -> text ----------
class _Text(HTMLParser):
    BLOCK = {"p", "div", "br", "li", "ul", "ol", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "table"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip += 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self._skip = max(0, self._skip - 1)
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def html_to_text(s: str | None, max_chars: int | None = None) -> str:
    if not s:
        return ""
    p = _Text()
    try:
        p.feed(s)
        p.close()
        text = "".join(p.parts)
    except Exception:
        text = re.sub(r"<[^>]+>", " ", s)
    text = html.unescape(text).replace("\xa0", " ")
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if max_chars and len(text) > max_chars:
        cut = text[:max_chars]
        sp = cut.rfind(" ")
        text = (cut[:sp] if sp > max_chars * 0.8 else cut).rstrip()
    return text


# ---------- ánh xạ thuộc tính ----------
class Mapper:
    def __init__(self, m: dict):
        self.m = m
        self.unmapped: dict[str, Counter] = {k: Counter() for k in ("color", "material")}
        self.strip_re = [re.compile(p) for p in m["material_name_strip_regex"]]
        self.excl = m["gender_name_exclusions"]
        self.tables = {}
        for attr in ("color", "material", "gender"):
            for use in ("name", "spec"):
                terms = []
                for code, d in m[attr].items():
                    assert code in ORDER[attr], f"code ngoài danh sách chuẩn: {attr}/{code}"
                    ts = list(d["terms"]) + (list(d["spec_extra"]) if use == "spec" else [])
                    terms += [(t.lower(), code) for t in ts]
                terms.sort(key=lambda x: -len(x[0]))  # cụm dài khớp trước
                self.tables[(attr, use)] = terms

    @staticmethod
    def _find(text: str, term: str):
        pat = r"(?<!\w)" + re.escape(term) + r"(?!\w)"
        return list(re.finditer(pat, text))

    def match(self, attr: str, text: str, use: str) -> list[str]:
        text = unicodedata.normalize("NFC", text.lower())
        if attr == "gender" and use == "name":
            for ex in self.excl:
                text = text.replace(ex, " ")
        if attr == "material" and use == "name":
            for rx in self.strip_re:
                text = rx.sub(" ", text)
        found: set[str] = set()
        for term, code in self.tables[(attr, use)]:
            for mt in self._find(text, term):
                found.add(code)
                text = text[: mt.start()] + " " * (mt.end() - mt.start()) + text[mt.end():]
        if attr == "gender":
            if "unisex" in found or {"male", "female"} <= found:
                found = {"unisex"}
            elif "kids" in found:
                found = {"kids"}
        return [c for c in ORDER[attr] if c in found]

    def from_values(self, attr: str, values: list[str], name: str) -> list[str]:
        """Ưu tiên spec/biến thể; không có thì suy từ tên. Không khớp => [] (không đoán)."""
        got: set[str] = set()
        for v in values:
            r = self.match(attr, v, "spec")
            if not r and attr in self.unmapped and v.strip():
                self.unmapped[attr][v.strip().lower()[:60]] += 1
            got.update(r)
        if not got:
            got.update(self.match(attr, name, "name"))
        return [c for c in ORDER[attr] if c in got]


def flatten_specs(detail: dict) -> dict[str, list[str]]:
    """specifications[].attributes[] + configurable_options[] -> {tên_thuộc_tính_lower: [giá trị]}."""
    out: dict[str, list[str]] = {}
    for grp in detail.get("specifications") or []:
        for a in grp.get("attributes") or []:
            k = str(a.get("name") or a.get("code") or "").strip().lower()
            v = html_to_text(str(a.get("value") or ""))
            if k and v:
                out.setdefault(k, []).append(v)
    for opt in detail.get("configurable_options") or []:
        k = str(opt.get("name") or opt.get("code") or "").strip().lower()
        vals = [str(v.get("label") or v.get("value") or "").strip() for v in opt.get("values") or []]
        vals = [v for v in vals if v]
        if k and vals:
            out.setdefault(k, []).extend(vals)
    return out


def pick_values(specs: dict[str, list[str]], m: dict, attr: str) -> list[str]:
    keys = m["spec_keys"]
    res: list[str] = []
    for k, vals in specs.items():
        if attr == "color" and k in keys["color"]:
            res += vals
        elif attr == "material" and any(s in k for s in keys["material_contains"]):
            res += vals
        elif attr == "gender" and k in keys["gender"]:
            res += vals
    return res


# ---------- chuẩn hóa 1 sản phẩm ----------
def to_int(x, default=0) -> int:
    try:
        return int(round(float(x)))
    except (TypeError, ValueError):
        return default


def sold_of(d: dict) -> int:
    qs = d.get("quantity_sold")
    if isinstance(qs, dict):
        return to_int(qs.get("value"))
    return to_int(d.get("all_time_quantity_sold") or qs)


def image_urls(d: dict, limit: int = 6) -> list[str]:
    urls = []
    for im in d.get("images") or []:
        u = im.get("large_url") or im.get("base_url") or im.get("medium_url") or im.get("thumbnail_url")
        if u and u.startswith(("http://", "https://")) and u not in urls:
            urls.append(u)
    if not urls and (d.get("thumbnail_url") or "").startswith("http"):
        urls.append(d["thumbnail_url"])
    return urls[:limit]


def norm_name_key(name: str, brand: str | None) -> str:
    return re.sub(r"\W+", " ", unicodedata.normalize("NFC", name).lower()).strip() + "|" + (brand or "").lower()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    add_workdir_arg(ap)
    ap.add_argument("--config", default=str(DATA_DIR / "config.json"))
    ap.add_argument("--mappings", default=str(DATA_DIR / "mappings.json"))
    ap.add_argument("--require-images", action="store_true",
                    help="chỉ giữ sản phẩm có ảnh đã tải (đọc out/image_manifest.json)")
    args = ap.parse_args()

    cfg = load_json(args.config)
    paths = Paths(args.workdir)
    mapper = Mapper(load_json(args.mappings))
    cat_order = [c["slug"] for c in cfg["categories"] if c.get("queries")]
    cands = load_json(paths.raw / "candidates.json", {})
    if not cands:
        print("Chưa có raw/candidates.json. Chạy crawl.py trước.", file=sys.stderr)
        return 1

    id_map: dict[str, str] = load_json(paths.out / "id_map.json", {})
    next_n = max([int(v[1:]) for v in id_map.values()] + [0]) + 1
    manifest = load_json(paths.out / "image_manifest.json", {}) if args.require_images else None

    drops: Counter = Counter()
    products, img_sources = [], {}
    seen_ids: set[str] = set()
    seen_names: set[str] = set()
    lo, hi = cfg["stock_range"]

    for slug in cat_order:
        for c in cands.get(slug, []):
            sid = c["id"]
            if sid in seen_ids:
                drops["trùng source_id"] += 1
                continue
            d = load_json(paths.raw / "detail" / f"{sid}.json")
            if d is None:
                drops["chưa cào detail"] += 1
                continue
            if d.get("_missing"):
                drops["detail 404/không hợp lệ"] += 1
                continue
            seen_ids.add(sid)
            name = html_to_text(d.get("name"))
            price = to_int(d.get("price"))
            if not name or price <= 0:
                drops["thiếu tên/giá"] += 1
                continue
            urls = image_urls(d)
            if not urls:
                drops["thiếu ảnh"] += 1
                continue
            brand = (d.get("brand") or {}).get("name") if isinstance(d.get("brand"), dict) else d.get("brand_name")
            brand = (brand or "").strip() or None
            nk = norm_name_key(name, brand)
            if nk in seen_names:
                drops["trùng tên+brand"] += 1
                continue
            seen_names.add(nk)

            if sid not in id_map:
                id_map[sid] = f"P{next_n:06d}"
                next_n += 1
            pid = id_map[sid]

            specs = flatten_specs(d)
            attrs = {}
            for attr in ("color", "material", "gender"):
                attrs[attr] = mapper.from_values(attr, pick_values(specs, mapper.m, attr), name)

            orig = to_int(d.get("original_price") or d.get("list_price"))
            if orig < price:
                orig = price
            qty = (d.get("stock_item") or {}).get("qty") if isinstance(d.get("stock_item"), dict) else None
            if isinstance(qty, int) and 0 < qty <= 100000:
                stock = qty
            else:
                stock = random.Random(f"{cfg['random_seed']}-{sid}").randint(lo, hi)

            desc = html_to_text(d.get("description"), cfg["description_max_chars"]) or \
                html_to_text(d.get("short_description"), cfg["description_max_chars"])
            n_img = cfg["images_per_product"]
            img_rel = [f"images/{pid}_{i}.jpg" for i in range(min(n_img, len(urls)))]
            if manifest is not None:
                img_rel = list(manifest.get(pid, []))
                if not img_rel:
                    drops["chưa có ảnh tải về (--require-images)"] += 1
                    continue
            products.append({
                "id": pid,
                "source": "tiki",
                "source_id": sid,
                "source_url": f"{cfg['base_url']}/{d['url_path']}" if d.get("url_path") else f"{cfg['base_url']}/p{sid}",
                "name": name,
                "description": desc,
                "brand": brand,
                "category": slug,
                "price": price,
                "original_price": orig,
                "stock": stock,
                "rating": round(float(d.get("rating_average") or 0), 1),
                "rating_count": to_int(d.get("review_count")),
                "sold_count": sold_of(d),
                "attributes": attrs,
                "tags": {},
                "images": img_rel,
            })
            img_sources[pid] = urls[:n_img]

    products.sort(key=lambda p: p["id"])
    used = {p["category"] for p in products}
    cats = [{k: c[k] for k in ("slug", "parent", "name_vi", "name_en")} for c in cfg["categories"]]
    parents_used = {c["parent"] for c in cats if c["slug"] in used}
    cats = [c for c in cats if c["slug"] in used or c["slug"] in parents_used]

    save_json(paths.out / "id_map.json", id_map)
    save_json(paths.out / "products.json", products)
    save_json(paths.out / "categories.json", cats)
    save_json(paths.out / "image_sources.json", img_sources)
    save_json(paths.out / "normalize_report.json", {
        "kept": len(products), "dropped": dict(drops),
        "unmapped_spec_values": {k: v.most_common(30) for k, v in mapper.unmapped.items()},
    })
    print(f"products: {len(products)}  categories: {len(cats)}  dropped: {dict(drops)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
