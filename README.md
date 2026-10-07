# E-Com Multimodal Search

Bài tập lớn môn **Phân tích và Thiết kế Hệ thống Thông tin**: Assignment 06, *Multimodal Search System for E-Commerce*.

Web thương mại điện tử (kiểu Tiki/Shopee) tập trung vào **tìm kiếm bằng văn bản, giọng nói và hình ảnh** (tiếng Việt và tiếng Anh). Thanh toán là giả lập. Dữ liệu sản phẩm được cào từ nguồn công khai, chỉ dùng cho mục đích học tập.

## Cấu trúc

```
backend/          Python: 3 layer theo đề (presentation / application / data) + domain
  main.py         CLI demo theo Task 6 (text, voice, image, order)
  dataset/        products.json, categories.json, vocabulary.json, orders.json, images/
frontend/         Web UI (Next.js), là Presentation layer (optional #10)
scripts/          Thu thập và làm giàu dữ liệu
```

## Tài liệu
- [DESIGN.md](DESIGN.md): hệ thống thiết kế giao diện

## Chạy nhanh
```bash
# 1. Backend (Python ≥ 3.11). Không cần GPU, DB hay API key
cd backend && python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python main.py                              # demo CLI: text, voice, image, order
python eval/run_eval.py                     # bảng đánh giá và ablation
uvicorn presentation.api.app:app --port 8000

# 2. Web UI (Node ≥ 20), ở terminal khác
cd frontend && npm install && npm run dev   # http://localhost:3000
```
- Bật AI qua API: copy `.env.example` thành `.env` rồi điền key (xem `backend/README.md`).
- Bật Postgres + pgvector: `docker compose up -d` và đặt `DATA_BACKEND=postgres` (xem `backend/README.md`).
