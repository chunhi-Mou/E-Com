# Sắm: product truth

## What it is
"Sắm" is a Vietnamese marketplace storefront (Tiki/Shopee category) built as a university project. Its reason to exist is **multimodal search**: shoppers find products by typing, speaking or showing a photo, in Vietnamese or English, including vague intent ("áo mùa đông", "đồ đi biển", "giày giống ảnh này nhưng màu trắng"). Everything else (catalog, cart, checkout, orders) must feel like a real shipped product, but payment is simulated.

## Audience
- Vietnamese online shoppers on desktop and mobile, used to Tiki/Shopee/Lazada conventions (dense product grids, price in đ, sold count, ratings, flash-sale energy) and expecting them.
- The grading lecturer, during a live demo. Search understanding must be *visible*: what the system understood, which filters it applied or relaxed, why items rank where they do.

## Surfaces and modes
- Storefront (home, category, search results, product detail, cart, checkout, order tracking): **Operate**. Scanability and trust beat expression.
- Search/voice/image interaction: the signature moment. Speed and feedback quality matter most.

## Constraints
- UI language: Vietnamese first. Search accepts Vietnamese (with or without diacritics) and English.
- Currency format: `299.000 ₫`. Dates: `07/10/2026`.
- Must not imitate any real brand (no Tiki/Shopee logos, colors-as-identity, or names).
- No real payment, no real personal data.
- Accessibility: keyboard reachable, visible focus, WCAG AA contrast, `prefers-reduced-motion` respected.

## Voice
Short, friendly, plain Vietnamese. No marketing fluff, no emoji in UI chrome. Empty and error states say what happened and what to try next.

## Evidence of success
- A spoken "tôi muốn mua áo mùa đông" goes from mic to relevant results in a few seconds with clear feedback at each step.
- Photo search feels as easy as pasting an image.
- The demo viewer can see the query representation and ranking score breakdown on demand (developer/inspect toggle), without cluttering the shopper view.
