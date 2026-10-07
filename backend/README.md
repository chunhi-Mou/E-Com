# Backend: Multimodal Search cho E-Commerce (Assignment 06)

Prototype Python chạy offline: không cần GPU, không cần DB, không cần API key, không tải model AI.
Hỗ trợ tìm sản phẩm bằng **text, voice (giả lập), image, multimodal (ảnh + text)** và tra cứu **đơn hàng**.

## Yêu cầu
- Python >= 3.11 (đã chạy với 3.13)
- Packages: `numpy`, `pillow`, `fastapi`, `uvicorn`, `python-multipart`, `pydantic`, `pytest`, `httpx`, `unidecode` (xem `requirements.txt`)

## Cài đặt và chạy
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python main.py                                   # demo 4 loại input: text, voice, image, order
python main.py --text "áo mùa đông"
python main.py --voice "Show me black running shoes under 2 million dong"
python main.py --image eval/query_images/navy_sweater.jpg
python main.py --image eval/query_images/white_tshirt.jpg --text "màu đen"   # multimodal
python main.py --order "where is my latest order?"
python main.py --profile keyword --text "áo mùa đông"                       # xem baseline

pytest                                           # test
python eval/run_eval.py                          # bảng ablation (-v: từng query, --config full: 1 cấu hình)
uvicorn presentation.api.app:app --port 8000     # API (docs tại /docs)
```

`dataset/` là dữ liệu cào từ Tiki (xem `scripts/data/README.md`). Test và bộ đánh giá `eval/` chạy trên catalog tổng hợp nhỏ ở `tests/fixtures/dataset/`. Sinh lại catalog đó và bộ đánh giá (đã commit sẵn):
```bash
python tests/fixtures/generate_seed.py        # categories, vocabulary, products, orders, ảnh tổng hợp
python tests/fixtures/make_eval_queries.py    # eval/queries.json và eval/query_images/
```

## Kiến trúc 3 lớp
```
presentation/   search_ui.py (CLI), api/ (FastAPI controllers)           chỉ gọi application
application/    query_service, speech_service, image_service,           logic nghiệp vụ + AI adapter
                search_service (RETRIEVAL), ranking_service (RANKING),
                order_service, catalog_service, search_orchestrator
data/           product/order/vocabulary repository, keyword_index (BM25),   truy cập dữ liệu
                vector_index (numpy cosine)
domain/         models.py, text_utils.py                                 dùng chung cho các lớp
container.py    composition root: nơi duy nhất ghép các adapter
```
Quy tắc phụ thuộc: `presentation -> application -> data`, `domain` dùng chung. `tests/test_architecture.py` kiểm tra bằng AST
(presentation không import `data`).

Pipeline: `Input -> (STT) -> QueryService -> QueryRepresentation -> SearchService (retrieval) -> RankingService -> kết quả + điểm`.

### Common Query Representation
`modality, raw_text, normalized_text, language, intent (PRODUCT_SEARCH | ORDER_LOOKUP | ORDER_LATEST), hard_filters,
soft_preferences, expansion_terms, text_embedding, image_embedding, weights {text, image}, parser`.
- **hard_filters**: chỉ những gì user nói rõ và map chắc chắn (danh mục kèm cây con, giá, brand, màu, chất liệu, giới tính).
- **soft_preferences**: suy luận (mùa, dịp, phong cách, độ giữ ấm), chỉ dùng để cộng điểm.
- **expansion_terms**: sinh từ dữ liệu (danh mục nào có sản phẩm mang tag mà user ám chỉ), không hard-code.

### Retrieval (`SearchService`) tách khỏi Ranking (`RankingService`)
- Hard filter áp ở `ProductRepository.find_ids` (tương đương `WHERE`). Nếu còn < 3 sản phẩm, nới dần
  (chất liệu, màu, brand, giới tính, giá; không bao giờ bỏ danh mục) và trả `relaxed_filters`. Filter bị nới vẫn được tính như sở thích mềm.
- Ứng viên: BM25 (tự cài bằng numpy, bỏ dấu, bigram) + vector text + vector ảnh, hợp nhất bằng Reciprocal Rank Fusion.
- Ranking: `S = α·S_text + β·S_image + γ·S_business + δ·S_soft`. Với text/voice β = 0. Multimodal: α, β theo λ_t / λ_i
  (mặc định λ_t = 0.4; nếu text hoàn toàn được giải thích bởi filter, ví dụ "màu đen", λ_t = 0.1). `S_text` trộn BM25 chuẩn hóa,
  cosine text và reranker. `S_business` = log(sold) + rating + còn hàng. `S_soft` = tỉ lệ soft preference khớp tag.

### Tổng quát, không hard-code theo sản phẩm
Mọi tri thức nằm trong dữ liệu: `dataset/vocabulary.json` (thuộc tính + synonyms), `dataset/categories.json` (cây danh mục + synonyms),
tên brand lấy từ sản phẩm. `tests/test_generality.py` thêm 1 danh mục và 1 sản phẩm mới vào dữ liệu rồi tìm thấy ngay mà không sửa code.
Ví dụ "áo mùa đông": `category=[ao-nam, ao-nu]` (hard), `season=winter` (soft), expansion = áo len, áo cổ lọ, áo khoác phao...; tag `winter`
đã gắn sẵn lúc nhập liệu giúp áo len (không chứa chữ "mùa đông" trong tên) vẫn được tìm thấy.

## Adapter có thể thay thế (cắm model thật ở phase 2, không đổi kiến trúc)
| Interface | Mặc định (offline) | Biến môi trường |
|---|---|---|
| `SpeechToText.transcribe(audio, lang_hint)` | `SimulatedSpeechToText` (nhận text, in rõ là giả lập) | `STT_ADAPTER` |
| `QueryParser.parse(text)` | `RuleQueryParser` | `QUERY_PARSER` |
| `TextEncoder.encode(list[str])` | `HashingTextEncoder` (word + char n-gram, IDF) | `TEXT_ENCODER` |
| `ImageEncoder.encode(list[bytes\|path])` | `ColorHistogramEncoder` (histogram màu HSV + lưới silhouette, Pillow + numpy) | `IMAGE_ENCODER` |
| `Reranker.score(query, docs)` | `TokenCoverageReranker` | `RERANKER` (`none` để tắt) |
| `VectorIndex`, `KeywordIndex`, `*Repository` | Numpy / BM25 / JSON | sửa trong `container.py` |

Thêm adapter mới = viết class và đăng ký vào dict tương ứng trong `container.py`. `SEARCH_PROFILE`
(`keyword | enriched | parser | full`) chọn cấu hình ablation; `DATASET_DIR` đổi thư mục dữ liệu.

## Phase 2: adapter AI qua API (tùy chọn, mặc định vẫn offline)
Không có key thì `python main.py` và `pytest` chạy y như trước. Chỉ khi đặt biến môi trường (hoặc `.env` ở `backend/` hay thư mục gốc repo,
được đọc tự động, biến môi trường thật được ưu tiên) thì adapter thật mới được dùng. Có key mà không chọn adapter thì không đổi hành vi,
trừ `/api/assistant/reply` tự dùng LLM/TTS nếu đã cấu hình.

| Chọn adapter | Giá trị | Biến môi trường cần | Ghi chú |
|---|---|---|---|
| `STT_ADAPTER` | `elevenlabs` | `ELEVENLABS_API_KEY`, `ELEVENLABS_STT_MODEL` (mặc định `scribe_v2`) | Scribe, trả `vi`/`en` |
| TTS (tự bật khi có đủ 2 biến) | | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_TTS_MODEL` (mặc định `eleven_flash_v2_5`) | cache mp3 ở `dataset/cache/tts/`, phục vụ tại `/static/tts/` |
| `QUERY_PARSER` | `llm` | `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_TIMEOUT_S` (mặc định 2.5), `LLM_JSON_MODE` (mặc định bật) | OpenAI-compatible; quá hạn/lỗi thì dùng kết quả rule (`parser="rules"`) |
| `TEXT_ENCODER` | `jina` | `JINA_API_KEY`, `JINA_TEXT_MODEL` (mặc định `jina-embeddings-v3`) | cache vector ở `dataset/cache/emb/` |
| `IMAGE_ENCODER` | `jina_clip` | `JINA_API_KEY`, `JINA_CLIP_MODEL` (mặc định `jina-clip-v2`) | có thêm `encode_text` để tìm ảnh bằng chữ |
| `RERANKER` | `jina` | `JINA_API_KEY`, `JINA_RERANK_MODEL` (mặc định `jina-reranker-v2-base-multilingual`) | lỗi API thì rơi về `TokenCoverageReranker` |

Ví dụ `.env` dùng Gemini qua endpoint OpenAI-compatible:
`LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, `LLM_MODEL=gemini-2.0-flash`. Đổi sang OpenAI, DeepSeek, Groq chỉ cần đổi 3 biến `LLM_*`.
Đổi `TEXT_ENCODER`/`IMAGE_ENCODER` thì index được dựng lại lúc khởi động (vector đã gọi API được cache theo model + hash nội dung, nên khởi động lần sau không gọi lại API).

Endpoint mới: `POST /api/speech/transcribe` (501 nếu chưa cấu hình STT), `POST /api/assistant/reply`
(`audio_url` là `null` khi chưa có TTS), `GET /api/search/suggest?q=` (offline).

Kiểm tra trực tiếp từng provider (cần internet và API key):
```bash
python -m tools.smoke_remote                     # mọi check; thiếu key thì SKIP
python -m tools.smoke_remote --only llm,parser,text,clip,rerank
python -m tools.smoke_remote --only stt --audio mau.wav
```
Làm giàu tag bằng LLM (lúc nhập liệu, có cache và chạy tiếp được, không sửa `products.json`):
```bash
python -m tools.enrich --dry-run --limit 3       # xem prompt, không gọi API
python -m tools.enrich --limit 20                # ghi dataset/enrichment.json
python -m tools.enrich                           # toàn bộ, chạy lại sẽ bỏ qua sản phẩm đã xong
```
`enrichment.json` có dạng `{product_id: {"tags": {season: [{"value", "confidence"}]}, "model", "input_hash"}}`. Repository chưa tự đọc file này.
Test của phần này dùng `httpx.MockTransport` (`tests/test_remote_adapters.py`, `tests/test_remote_api.py`, `tests/test_enrich.py`), không gọi mạng.

## API
```bash
curl -s localhost:8000/api/search -H 'content-type: application/json' \
  -d '{"text":"áo mùa đông","modality":"text","limit":5,"filters":{"price_max":1000000,"sort":"best_selling"}}'
curl -s localhost:8000/api/search -H 'content-type: application/json' \
  -d '{"text":"show me black running shoes under 2 million dong","modality":"voice"}'
curl -s localhost:8000/api/search/image -F image=@eval/query_images/navy_sweater.jpg -F text=
curl -s 'localhost:8000/api/products?category=ao-nam&page=1&page_size=5&sort=price_asc'
curl -s localhost:8000/api/products/P000001
curl -s localhost:8000/api/categories
curl -s localhost:8000/api/orders/20261001
curl -s 'localhost:8000/api/orders/latest?customer_id=C001'
curl -sI localhost:8000/static/images/P000001_0.jpg
```
CORS cho `http://localhost:3000` (đổi bằng `CORS_ORIGINS`). URL ảnh tuyệt đối lấy từ host của request (hoặc `PUBLIC_BASE_URL`).

## Dữ liệu mẫu
`dataset/` là dữ liệu giả (`source: "seed"`): 59 sản phẩm, 49 danh mục (cây 3 cấp, 34 danh mục lá, gồm thời trang nam/nữ,
giày, túi, điện tử, gia dụng), 6 đơn hàng (có `20261001`), ảnh sản phẩm là silhouette vẽ bằng Pillow (`tools/render.py`).
Định dạng dữ liệu cố định, nên có thể thay bằng dữ liệu cào thật.

## Đánh giá
`eval/queries.json`: 36 query có nhãn (explicit, implicit, bilingual, unaccented, voice, image, multimodal, order). Nhãn trỏ tới catalog tổng hợp trong `tests/fixtures/dataset/` (mặc định của `--dataset-dir`), chưa có nhãn cho dữ liệu Tiki.
`eval/run_eval.py` in Success@1, P@10 (chia cho min(10, số nhãn đúng)), nDCG@10, MRR cho 4 cấu hình:
`keyword` (BM25 tên + mô tả, text thô) -> `enriched` (+ làm giàu lúc index) -> `parser` (+ rule parser, filter, soft) -> `full`
(+ expansion, dense, reranker, business). Nhãn viết tay dựa trên danh mục/thuộc tính/giá của sản phẩm, không dùng tag của search.

## Chạy với PostgreSQL + pgvector (optional: vector database)
```bash
pip install -r requirements-postgres.txt
docker compose up -d --wait          # từ thư mục gốc repo
python -m db.load                    # nạp dataset + embedding (idempotent)
DATA_BACKEND=postgres python main.py # hoặc uvicorn presentation.api.app:app
```
`DATA_BACKEND=json` (mặc định) dùng JSON + numpy. Hai backend có cùng interface, chỉ khác ở `container.py`.
Nếu đổi `TEXT_ENCODER` hoặc `IMAGE_ENCODER`, chạy lại `python -m db.load --text-model <tên> --image-model <tên>`.

## Hạn chế
- Không có API key thì hệ thống chạy bằng các bản offline:
  - voice giả lập (nhận text);
  - `HashingTextEncoder` không có ngữ nghĩa thật;
  - `ColorHistogramEncoder` chỉ hợp với ảnh nền đồng nhất.
  Các adapter API (ElevenLabs, LLM OpenAI-compatible, Jina) mới được kiểm thử bằng response giả. Cần chạy `python -m tools.smoke_remote` trên máy có Internet để xác nhận định dạng request.
- LLM parser chỉ bổ sung sở thích mềm và từ mở rộng (danh mục do LLM suy ra cũng chỉ là soft). Giá và mã đơn luôn do rule parser quyết định. Nếu LLM quá `LLM_TIMEOUT_S` thì hệ thống quay về rule parser.
- Rule parser: giá chỉ hiểu các mẫu phổ biến (không có "khoảng", "triệu rưỡi"). "dưới 500" không đơn vị được hiểu là 500k (vi) hoặc 500 USD (en). "xanh" ánh xạ cả xanh dương và xanh lá.
- Ngưỡng nới filter là 3 kết quả. Filter bị nới được báo trong `relaxed_filters`.
- Bộ eval hiện tại (36 query, catalog tổng hợp 59 sản phẩm) có nhãn do người viết hệ thống tạo. Điểm cao chỉ chứng minh pipeline chạy đúng, chưa phải chất lượng trên dữ liệu Tiki. Cần gán nhãn bộ query riêng cho `dataset/`.
- Dữ liệu Tiki chưa có `tags` (mùa, dịp, phong cách, độ ấm). Các tag này được điền bằng `python -m tools.enrich` (cần LLM key). Chưa chạy thì soft boost theo tag không có tác dụng.
