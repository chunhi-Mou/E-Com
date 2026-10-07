#!/usr/bin/env python3
"""Mock server MÔ PHỎNG hình dạng API Tiki v2 để kiểm thử pipeline khi không truy cập được tiki.vn.

DỮ LIỆU TỔNG HỢP, KHÔNG PHẢI SẢN PHẨM THẬT. Không dùng làm dataset. Chỉ nghe 127.0.0.1.
  python mock_server.py --port 8765 [--block-after 40]   # sau N request trả 429 để thử logic dừng
Hình dạng response dựa trên hiểu biết về API công khai của Tiki (chưa được đối chiếu với response thật).
"""
from __future__ import annotations

import argparse
import io
import json
import random
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from PIL import Image, ImageDraw

TEMPLATES = [
    ("áo len nữ", "Áo len cổ lọ nữ dệt kim {c}", {"Màu sắc": "{c}", "Chất liệu": "Len", "Giới tính": "Nữ"}),
    ("áo len nam", "Áo len nam {c} cổ tròn", {"Chất liệu": "len lông cừu"}),
    ("giày da nam", "Giày da nam công sở {c} da bò thật", {"Màu sắc": "{c}", "Chất liệu": "Da"}),
    ("túi xách nữ", "Túi xách nữ da PU {c} đeo chéo", {"Chất liệu": "Da PU"}),
    ("tai nghe bluetooth", "Tai nghe bluetooth không dây {c} chống ồn", {"Màu sắc": "{c}"}),
    ("bình giữ nhiệt", "Bình giữ nhiệt inox 500ml {c} nam nữ", {"Chất liệu": "Inox 304"}),
    ("quần jean nam", "Quần jean nam ống đứng {c} Việt Nam", {}),
]
COLORS = ["Đen", "Trắng", "Xanh navy", "Xanh", "Be", "Nâu", "Đỏ đô", "Xám", "Xanh đen", "Hồng"]
RGB = {"Đen": (30, 30, 30), "Trắng": (240, 240, 240), "Xanh navy": (20, 30, 90), "Xanh": (40, 90, 200),
       "Be": (225, 205, 170), "Nâu": (110, 70, 40), "Đỏ đô": (130, 20, 40), "Xám": (140, 140, 140),
       "Xanh đen": (15, 40, 60), "Hồng": (240, 150, 180)}


def build(n_per=12):
    rng = random.Random(1)
    prods, pid = {}, 90000
    for q, tpl, spec in TEMPLATES:
        for i in range(n_per):
            pid += 1
            c = COLORS[i % len(COLORS)]
            price = rng.choice([99000, 159000, 249000, 399000, 799000, 1290000])
            name = tpl.format(c=c.lower())
            if i == 3:  # trùng tên+brand với i==2 khác id => phải bị loại
                name = tpl.format(c=COLORS[2].lower())
            prods[pid] = {
                "id": pid, "seller_product_id": pid + 5, "q": q, "name": name, "color": c,
                "brand": rng.choice([None, "Uniqlo", "Local Brand", "Xiaomi"]), "price": price,
                "list_price": int(price * 1.3) if i % 2 else price,
                "no_images": i == 11, "spec": {k: v.format(c=c) for k, v in spec.items()},
            }
    return prods


PRODS = build()
STATE = {"n": 0, "block_after": None, "port": 0}


def detail_json(p, base):
    imgs = [] if p["no_images"] else [
        {"base_url": f"{base}/img/{p['id']}/{k}.png", "large_url": f"{base}/img/{p['id']}/{k}.png"} for k in range(3)]
    return {
        "id": p["id"], "name": p["name"], "url_path": f"mock-p{p['id']}.html",
        "brand": {"id": 1, "name": p["brand"]} if p["brand"] else None,
        "price": p["price"], "list_price": p["list_price"], "original_price": p["list_price"],
        "rating_average": 4.6, "review_count": 12, "quantity_sold": {"text": "Đã bán 20", "value": 20},
        "description": f"<p>Mô tả <b>{p['name']}</b></p><ul><li>Chất lượng &amp; bền</li><li>Giao nhanh</li></ul><script>x()</script>",
        "images": imgs,
        "specifications": [{"name": "Thông số", "attributes": [{"code": "x", "name": k, "value": v} for k, v in p["spec"].items()]}],
        "configurable_options": [{"name": "Màu", "values": [{"label": p["color"]}]}] if p["id"] % 2 == 0 else [],
    }


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        STATE["n"] += 1
        if STATE["block_after"] and STATE["n"] > STATE["block_after"]:
            return self._send(429, b'{"error":"too many requests"}')
        u = urlparse(self.path)
        qs = {k: v[0] for k, v in parse_qs(u.query).items()}
        base = f"http://127.0.0.1:{STATE['port']}"
        if u.path == "/api/v2/products":
            q, page, limit = qs.get("q", ""), int(qs.get("page", 1)), int(qs.get("limit", 40))
            items = [p for p in PRODS.values() if p["q"] == q]
            last = max(1, -(-len(items) // limit))
            chunk = items[(page - 1) * limit: page * limit]
            data = [{"id": p["id"], "seller_product_id": p["seller_product_id"], "name": p["name"], "price": p["price"]} for p in chunk]
            return self._send(200, json.dumps({"data": data, "paging": {"current_page": page, "last_page": last, "total": len(items)}}).encode())
        if u.path.startswith("/api/v2/products/"):
            pid = int(u.path.rsplit("/", 1)[1])
            if pid not in PRODS:
                return self._send(404, b'{"error":"not found"}')
            return self._send(200, json.dumps(detail_json(PRODS[pid], base)).encode())
        if u.path.startswith("/img/"):
            pid = int(u.path.split("/")[2])
            im = Image.new("RGB", (900, 1200), RGB[PRODS[pid]["color"]])
            ImageDraw.Draw(im).rectangle((100, 100, 800, 1100), outline=(255, 255, 255), width=8)
            buf = io.BytesIO()
            im.save(buf, "PNG")
            return self._send(200, buf.getvalue(), "image/png")
        self._send(404, b"{}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--block-after", type=int)
    a = ap.parse_args()
    STATE.update(port=a.port, block_after=a.block_after)
    ThreadingHTTPServer(("127.0.0.1", a.port), H).serve_forever()
