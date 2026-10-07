# Sắm frontend

Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4, Motion. UI in Vietnamese. Visual system: see `/DESIGN.md`.

## Run

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm run lint
```

`next/font/google` downloads Be Vietnam Pro at build time and self-hosts it, so the first build needs internet access. Nothing is requested from Google at runtime.

## Mock mode vs. backend

| `NEXT_PUBLIC_USE_MOCK` | Behaviour |
|---|---|
| unset (default) | Auto: probes `GET {API_URL}/api/categories` (1.5 s). Backend reachable means real API, otherwise mock. |
| `1` | Always mock. No backend needed. |
| `0` | Always real backend. |

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000`. Copy `.env.example` to `.env.local` to change either. The footer says which mode is active.

Mock mode (`src/mocks/`) has about 100 generated products and a small rule-based parser that returns the same shapes as the backend API (representation, hard and soft filters, relaxed filters, score breakdown, order lookup). Product images are generated SVG placeholders served by the `/mock-img/[kind]/[color]` route. Image search in mock mode ranks by the dominant colour of the uploaded picture.

Try: `áo mùa đông`, `đồ đi biển`, `giày thể thao màu cam dưới 150k`, `white sneakers under 500k`, `đơn hàng 20261001`, `xe máy` (empty state).

## Voice and image

- Mic: records with MediaRecorder, draws a live level meter with Web Audio, and runs the browser Web Speech API (`vi-VN` or `en-US`) for the live transcript. On stop it first tries `POST /api/speech/transcribe`; if that is missing or fails, the browser transcript is used. Chrome or Edge recommended.
- Reply: `POST /api/assistant/reply` when available (plays `audio_url`), otherwise a local sentence read with `speechSynthesis`.
- Suggestions: `GET /api/search/suggest`, falling back to local suggestions on 404.
- Image: picker, drag-and-drop anywhere on the page, or paste (Ctrl+V). Optional text in the field is sent with the image.
- Press `/` to focus the search field. Esc cancels recording.

## Client-side extensions beyond the contract

- Removing an "understood" filter chip sends `filters.ignore: [...]` (see `SearchFilters` in `src/lib/types.ts`). For category and price the real-backend client translates this into contract-valid overrides; for other attributes, an unsupported backend responds 4xx and the request is retried without it.
- Color and brand facets, and category refinement inside a query, are applied on the client over the returned results.
- Cart, checkout and orders placed in the browser are stored in `localStorage` (`sam-cart-v1`, `sam-orders-v1`). Their status advances with time (pending, confirmed, shipping, delivered) for demonstration.

## Screenshots

```bash
npm run build && npx next start -p 3100 &
node scripts/screenshots.mjs http://localhost:3100 screenshots
```

Uses the Chromium under `PLAYWRIGHT_BROWSERS_PATH`; do not run `playwright install`.
