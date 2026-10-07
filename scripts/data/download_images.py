#!/usr/bin/env python3
"""Tải ảnh sản phẩm: resize cạnh dài 512px, JPEG q85, tên P{id}_{i}.jpg vào out/images/.

Đọc out/image_sources.json (do normalize.py tạo). Chạy tăng dần: ảnh đã có thì bỏ qua.
Giới hạn mỗi lần chạy bằng --max-images (mặc định 1500 ảnh MỚI). Thứ tự xen kẽ giữa các danh mục
để khi dừng sớm vẫn phủ đủ danh mục. Ghi out/image_manifest.json {product_id: ["images/P000001_0.jpg"]}.
"""
from __future__ import annotations

import argparse
import io
import sys

from PIL import Image, ImageOps
from tqdm import tqdm

from common import DATA_DIR, Blocked, Fetcher, Paths, add_workdir_arg, load_json, save_json


def to_jpeg(raw: bytes, long_side: int, quality: int) -> bytes:
    im = Image.open(io.BytesIO(raw))
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.getchannel("A"))
        im = bg
    else:
        im = im.convert("RGB")
    w, h = im.size
    scale = long_side / max(w, h)
    if scale < 1:  # chỉ thu nhỏ, không phóng to
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def interleave(products: list[dict]) -> list[dict]:
    by_cat: dict[str, list[dict]] = {}
    for p in products:
        by_cat.setdefault(p["category"], []).append(p)
    out = []
    for i in range(max((len(v) for v in by_cat.values()), default=0)):
        for lst in by_cat.values():
            if i < len(lst):
                out.append(lst[i])
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    add_workdir_arg(ap)
    ap.add_argument("--config", default=str(DATA_DIR / "config.json"))
    ap.add_argument("--max-images", type=int, default=1500, help="số ảnh mới tối đa trong lần chạy này")
    ap.add_argument("--per-product", type=int, help="ảnh/sản phẩm (mặc định theo config, 1-3)")
    args = ap.parse_args()

    cfg = load_json(args.config)
    paths = Paths(args.workdir)
    per = max(1, min(3, args.per_product or cfg["images_per_product"]))
    sources = load_json(paths.out / "image_sources.json")
    products = load_json(paths.out / "products.json")
    if not sources or not products:
        print("Thiếu out/image_sources.json hoặc products.json. Chạy normalize.py trước.", file=sys.stderr)
        return 1
    paths.images.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, list[str]] = load_json(paths.out / "image_manifest.json", {})

    f = Fetcher(paths)
    new, failed, skipped = 0, 0, 0
    try:
        bar = tqdm(total=args.max_images, unit="ảnh")
        for p in interleave(products):
            pid = p["id"]
            for i, url in enumerate(sources.get(pid, [])[:per]):
                rel = f"images/{pid}_{i}.jpg"
                dest = paths.out / rel
                if dest.exists():
                    skipped += 1
                    if rel not in manifest.setdefault(pid, []):
                        manifest[pid].append(rel)
                    continue
                if new >= args.max_images:
                    break
                try:
                    r = f.get(url, expect="image")
                    if r is None:
                        failed += 1
                        continue
                    dest.write_bytes(to_jpeg(r.content, cfg["image_long_side"], cfg["image_jpeg_quality"]))
                except Blocked:
                    raise
                except Exception as e:  # ảnh hỏng / lỗi mạng đơn lẻ: bỏ qua ảnh này
                    failed += 1
                    print(f"\nlỗi ảnh {url}: {e!r}", file=sys.stderr)
                    continue
                manifest.setdefault(pid, []).append(rel)
                new += 1
                bar.update(1)
            if new >= args.max_images:
                break
        bar.close()
    except Blocked as e:
        print(f"\nDỪNG: bị chặn - {e}", file=sys.stderr)
        return 2
    finally:
        for pid in manifest:
            manifest[pid] = sorted(set(manifest[pid]))
        save_json(paths.out / "image_manifest.json", manifest)
        f.close()
    total = sum(len(v) for v in manifest.values())
    print(f"mới: {new}, đã có: {skipped}, lỗi: {failed}, tổng ảnh trong manifest: {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
