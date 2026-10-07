# scripts/data - thu thập dữ liệu sản phẩm

Pipeline: `crawl.py` -> `normalize.py` -> `download_images.py` -> `normalize.py --require-images` -> `stats.py`.
Output nằm ở `scripts/data/out/` (KHÔNG ghi vào `backend/`; merge sang `backend/dataset/` là bước thủ công).
Cache thô ở `scripts/data/raw/` (đã gitignore).

## Lưu ý
Hình dạng response Tiki trong code dựa trên API công khai. Chạy `python crawl.py --probe` để kiểm tra truy cập trước khi cào.

## Cài đặt
```bash
python3 -m venv scripts/data/.venv
scripts/data/.venv/bin/pip install httpx pillow tqdm unidecode
cd scripts/data
```

## Chạy
```bash
python crawl.py --probe                    # 1-2 request kiểm tra truy cập
python crawl.py --target 200               # cào list + detail, ~200 sp/danh mục (config.json)
python crawl.py --categories ao-len-nu --target 30   # chạy thử nhỏ
python normalize.py                        # -> out/products.json, categories.json, image_sources.json
python download_images.py --max-images 1500   # tải ảnh tăng dần, ảnh đã có thì bỏ qua
python normalize.py --require-images       # chỉ giữ sản phẩm đã có ảnh thật, images[] = ảnh đã tải
python stats.py                            # thống kê
```
Chạy lại các lệnh an toàn: response đã cache không gọi lại; id `P000001...` ổn định nhờ `out/id_map.json`.
Muốn mở rộng: tăng `--target` / `--max-images` rồi chạy lại cả chuỗi.

Kiểm thử không cần mạng:
```bash
python mock_server.py --port 8765 &
python crawl.py --workdir mock_run --base-url http://127.0.0.1:8765 --target 20
python normalize.py --workdir mock_run && python download_images.py --workdir mock_run && python stats.py --workdir mock_run
```

## File
| File | Vai trò |
|---|---|
| `config.json` | 14 danh mục lá + từ khóa tìm kiếm, mục tiêu/danh mục, tham số ảnh, seed |
| `mappings.json` | Từ khóa vi/en -> code chuẩn (color/material/gender) |
| `common.py` | rate limit (<= 2 req/s), retry/backoff, log `raw/request_log.jsonl`, dừng khi bị chặn |
| `crawl.py`, `normalize.py`, `download_images.py`, `stats.py` | các bước pipeline |
| `mock_server.py` | server giả (dữ liệu tổng hợp) để kiểm thử |

## Quy tắc chuẩn hóa
- Mô tả: bỏ HTML, giải mã entity, cắt <= 2000 ký tự (theo ranh giới từ).
- `color`/`material`/`gender`: ưu tiên spec/biến thể (`Màu sắc`, `Chất liệu`, `Giới tính`...), không có thì suy từ tên;
  chỉ nhận khi khớp bảng `mappings.json`. Từ mơ hồ (ví dụ "xanh" đứng một mình, "da" trong tên) **để trống, không đoán**.
  Giá trị spec không map được được thống kê trong `out/normalize_report.json` để bổ sung bảng.
- Loại sản phẩm: trùng `source_id`, trùng (tên + brand), thiếu ảnh, thiếu tên/giá.
- `stock`: dùng `stock_item.qty` nếu nguồn có, không thì sinh ngẫu nhiên seed cố định (`random_seed`, 5-200).
- `tags` = `{}` (điền ở bước enrichment, ngoài phạm vi). `category` = danh mục lá theo query đã cào (cấu hình, không phải phân loại của Tiki).
- Ảnh: tối đa `images_per_product` (mặc định 2) ảnh/sp, cạnh dài 512px (chỉ thu nhỏ), JPEG q85, `P{id}_{i}.jpg`.

## Giới hạn đã biết
- Danh mục lá gán theo từ khóa tìm kiếm nên có nhiễu (kết quả search lẫn sản phẩm không đúng loại).
- Khớp từ khóa tiếng Việt theo chuỗi có dấu; tên viết không dấu sẽ ít khớp hơn. Một số từ thiên lệch (ví dụ "len" -> wool, "lụa" -> silk).
- Ảnh/mô tả sản phẩm có thể lấy từ nhiều nhà bán; không kiểm chứng chất lượng.
- Nếu nguồn trả 403/429/captcha hoặc proxy từ chối, script **dừng** và không cố lách.

## Pháp lý
Dữ liệu chỉ dùng cho mục đích học tập (bài tập lớn), không phân phối lại và không dùng thương mại.
Nội dung/ảnh thuộc về Tiki và nhà bán. Tôn trọng điều khoản dịch vụ và robots.txt của nguồn; giữ tốc độ thấp (<= 2 req/s).
Không commit `raw/` và `out/images/`.

