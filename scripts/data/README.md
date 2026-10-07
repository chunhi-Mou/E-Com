# scripts/data - thu thập dữ liệu sản phẩm

Pipeline: `crawl.py` -> `normalize.py` -> `download_images.py` -> `normalize.py --require-images` -> `stats.py` -> `export_dataset.py`.
Output trung gian nằm ở `scripts/data/out/`. `export_dataset.py` mới ghi sang `backend/dataset/`.
Cache thô ở `scripts/data/raw/` (đã gitignore).

## Cài đặt
```bash
python -m venv scripts/data/.venv
scripts/data/.venv/bin/pip install httpx pillow tqdm unidecode
cd scripts/data
```

## Chạy
```bash
python crawl.py --probe                    # 1-2 request kiểm tra truy cập
python crawl.py                            # cào list + detail theo config.json (35 sp/danh mục lá)
python crawl.py --categories ao-len-nu --target 30   # chạy thử nhỏ
python normalize.py                        # -> out/products.json, categories.json, image_sources.json
python download_images.py --max-images 3000   # tải ảnh tăng dần, ảnh đã có thì bỏ qua
python normalize.py --require-images       # chỉ giữ sản phẩm đã có ảnh thật, images[] = ảnh đã tải
python stats.py                            # thống kê
python export_dataset.py                   # -> backend/dataset/ (products, categories, images, orders)
```
Chạy lại các lệnh an toàn: response đã cache không gọi lại; id `P000001...` ổn định nhờ `out/id_map.json`.
Muốn mở rộng: tăng `target_per_category` trong `config.json` hoặc `--max-images` rồi chạy lại cả chuỗi.
`backend/dataset/vocabulary.json` viết tay, `export_dataset.py` không ghi đè.

## File
| File | Vai trò |
|---|---|
| `config.json` | cây danh mục (34 danh mục lá) + từ khóa tìm kiếm + synonyms, mục tiêu/danh mục, tham số ảnh, seed |
| `mappings.json` | Từ khóa vi/en -> code chuẩn (color/material/gender) |
| `common.py` | rate limit, retry/backoff, log `raw/request_log.jsonl`, dừng khi bị chặn |
| `crawl.py`, `normalize.py`, `download_images.py`, `stats.py` | các bước pipeline |
| `export_dataset.py` | ghi `out/` sang `backend/dataset/`, tạo đơn hàng demo |

## Tốc độ và giới hạn của nguồn
- API Tiki: 1 request mỗi 2 giây. Ảnh trên CDN: tối đa 2 request/giây.
- Tiki thỉnh thoảng trả HTTP 200 với body rỗng khi bị gọi nhiều (giới hạn tốc độ). `crawl.py` nghỉ 2, 5, 10 phút rồi thử lại; hết lượt thì dừng. Chạy lại để cào tiếp phần còn thiếu (đã cache).
- 403/429/captcha hoặc proxy từ chối: script **dừng** và không cố lách.

## Quy tắc chuẩn hóa
- Mô tả: bỏ HTML, giải mã entity, cắt <= 2000 ký tự (theo ranh giới từ).
- `color`/`material`/`gender`: ưu tiên spec/biến thể (`Màu sắc`, `Chất liệu`, `Giới tính`...), không có thì suy từ tên;
  chỉ nhận khi khớp bảng `mappings.json`. Từ mơ hồ (ví dụ "xanh" đứng một mình, "da" trong tên) **để trống, không đoán**.
  Giá trị spec không map được được thống kê trong `out/normalize_report.json` để bổ sung bảng.
- Loại sản phẩm: trùng `source_id`, trùng (tên + brand), thiếu ảnh, thiếu tên/giá.
- `stock`: dùng `stock_item.qty` nếu nguồn có, không thì sinh ngẫu nhiên seed cố định (`random_seed`, 5-200).
- `tags` = `{}` (điền ở bước enrichment: `python -m tools.enrich` trong `backend/`). `category` = danh mục lá theo query đã cào (cấu hình, không phải phân loại của Tiki).
- Ảnh: tối đa `images_per_product` (mặc định 2) ảnh/sp, cạnh dài 480px (chỉ thu nhỏ), JPEG q80, `P{id}_{i}.jpg`.

## Giới hạn đã biết
- Danh mục lá gán theo từ khóa tìm kiếm nên có nhiễu (kết quả search lẫn sản phẩm không đúng loại).
- Khớp từ khóa tiếng Việt theo chuỗi có dấu; tên viết không dấu sẽ ít khớp hơn. Một số từ thiên lệch (ví dụ "len" -> wool, "lụa" -> silk).
- Ảnh/mô tả sản phẩm có thể lấy từ nhiều nhà bán; không kiểm chứng chất lượng.

## Pháp lý
Dữ liệu chỉ dùng cho mục đích học tập (bài tập lớn), không phân phối lại và không dùng thương mại.
Nội dung/ảnh thuộc về Tiki và nhà bán. `robots.txt` của Tiki chỉ chặn `/api/v2/me/` và `/api/v2/reviews/writable`; pipeline không gọi các đường dẫn đó. Giữ tốc độ thấp như trên.
Không commit `raw/`.
