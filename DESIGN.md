---
name: Sắm
description: Vietnamese marketplace storefront whose signature is multimodal search. World drawn from the receipt pad, school ink (mực tím) and the red company seal (con dấu).
colors:
  ink-50: "oklch(0.972 0.012 278)"
  ink-100: "oklch(0.945 0.024 278)"
  ink-200: "oklch(0.89 0.05 278)"
  ink-300: "oklch(0.79 0.09 277)"
  ink-500: "oklch(0.55 0.19 275)"
  ink-600: "oklch(0.46 0.2 275)"
  ink-700: "oklch(0.39 0.18 275)"
  ink-800: "oklch(0.31 0.14 276)"
  ink-950: "oklch(0.19 0.06 278)"
  seal-50: "oklch(0.972 0.016 27)"
  seal-100: "oklch(0.94 0.04 27)"
  seal-600: "oklch(0.53 0.215 27)"
  seal-700: "oklch(0.45 0.185 27)"
  highlighter: "oklch(0.92 0.15 100)"
  highlighter-soft: "oklch(0.965 0.07 100)"
  highlighter-ink: "oklch(0.38 0.07 85)"
  ok: "oklch(0.5 0.13 155)"
  star: "oklch(0.76 0.16 78)"
  paper: "oklch(0.975 0.006 278)"
  sheet: "oklch(1 0 0)"
  line: "oklch(0.91 0.012 278)"
  line-strong: "oklch(0.83 0.02 278)"
  fg: "oklch(0.22 0.03 278)"
  muted: "oklch(0.46 0.03 278)"
typography:
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  price:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  header:
    backgroundColor: "{colors.ink-800}"
    textColor: "{colors.sheet}"
    height: "64px"
  search-field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.fg}"
    rounded: "{rounded.lg}"
    height: "48px"
  button-buy:
    backgroundColor: "{colors.seal-600}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    height: "48px"
  button-primary:
    backgroundColor: "{colors.ink-600}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    height: "40px"
  product-card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.lg}"
    padding: "12px"
  notice-relaxed:
    backgroundColor: "{colors.highlighter-soft}"
    textColor: "{colors.highlighter-ink}"
    rounded: "{rounded.md}"
---

## Overview

Sắm is an Operate surface: shoppers scan, compare and buy, so the shell is the familiar marketplace one (search-first header, category rail, dense product grid, receipt-style totals). The world lends four things only: type, palette, density and one signature move.

The world is the Vietnamese paperwork of buying: the receipt pad, the violet-blue ballpoint and school ink (mực tím) that everyone wrote with, and the round red company seal (con dấu) pressed on every document. Ink blue carries the shell and every interactive affordance. Seal red carries price, sale and the buy action. A highlighter yellow marks notices and nothing else.

Signature move: the **seal stamp**. Adding to cart and placing an order press a red double-ring seal onto the page with a spring thump (scale 1.9 to 1, slight tilt, blur resolving). The logo is the same seal at rest. Nothing else in the UI imitates paperwork, so the move stays rare.

The second signature is the search itself: text, voice and image share one field. The system's understanding is shown as "Sắm hiểu" chips, and an Inspect toggle (for the lecturer) exposes the query representation and per-item score bars.

Light theme only. Scene: a shopper on a phone or laptop in daylight or a lit room, comparing prices.

## Colors

Strategy: Committed shell (ink-800 header and bands), restrained content (paper ground, white sheets), one saturated action color (seal).

- **Ink scale (hue 275)**: ink-800 header, bands, Inspect header; ink-600 primary buttons, selection, links; ink-50 to ink-200 tints for hover, chips, skeletons.
- **Seal (hue 27)**: seal-600 for price, discount, buy and submit; seal-50/100 tint behind price blocks and discount tags. Never used for errors alone; errors add text and a ring.
- **Highlighter**: relaxed-filter notice, simulated-payment notice, Inspect toggle when on, focus ring on the search field.
- **Neutrals** are tinted toward the ink hue (chroma 0.006 to 0.03); no pure gray, no pure black text.
- **Functional**: ok green for delivered and savings, star amber for ratings.

Contrast: body text fg on paper is above 14:1; muted on paper above 6:1; white on ink-800 and on seal-600 above 5:1.

## Typography

- **Be Vietnam Pro** (400 to 800) for all UI and body: designed for Vietnamese diacritics, so stacked marks (ữ, ặ, ộ) stay legible at small sizes.
- **Barlow Condensed** (600, 700) only for the stamp, the discount tag and ranking labels. It is the "printed form" voice and is used sparingly.
- Numerals: prices and counts use tabular figures (`.num`); money is `299.000 ₫` with a non-breaking space. Dates are `07/10/2026`.
- Scale: 12 / 13 / 14 / 15 (body) / 17 / 20 / 24 / 28 (price on detail). Titles balance wrap, paragraphs use pretty wrap and stay under 68ch.

## Layout

- 1360px max shell, 16px gutter on phones, 24px from 768px.
- Home: category rail (232px) + deals panel; search results: facet sidebar (236px) + grid + optional Inspect column (340px, desktop only).
- Grid density: 2 columns at 360px, 3 at 640px, 4 at 1280px (3 when Inspect is docked), 5 to 6 on the home rows.
- Header is sticky. On phones the logo row scrolls away and the search row stays.
- Totals use receipt rhythm: label, dotted leader, right-aligned tabular amount, a double rule above the grand total.

## Elevation & Depth

Flat by default: 1px `line` borders on white sheets. Hover on cards adds a soft offset shadow (0 10px 24px -14px at 35% ink). Popovers and the voice panel use a larger offset shadow (`shadow-pop`). No zero-offset glows, no glass. The page dims (ink-950 at 40%) only while the search dropdown is open.

## Shapes

6px for chips and small controls, 8px for buttons and inputs, 12px for the search field, cards and panels, full pill for filter chips and "Sắm hiểu" chips. The seal is the only circle at scale.

## Components

- **Search field**: white, 12px radius, 3px highlighter ring on focus, grows from 640 to 780px (spring). Holds an image chip, input, clear, camera, mic and the red submit button. While recording the field turns into a listening view: pulsing mic whose ring scales with the real audio level, 24 level bars, live transcript, VI/EN switch, cancel and done.
- **Dropdown**: recent searches, example queries, and two plain rows for "Nói để tìm" and "Tìm bằng ảnh".
- **Product card**: square image, two-line name, red price, rating and sold count, corner discount tag (condensed label), hover quick-add. With Inspect on, a dashed-top score block (text, image, business, soft, final).
- **Understood chips**: hard filters are solid outlined chips with a remove button; soft preferences are dashed and not removable; relaxed filters are struck through with an "đã nới" tag.
- **Voice panel**: ink-800 header, three-step progress (receive, search, reply), transcript, spoken reply with replay and auto-read toggle. Dismissible.
- **Stamp**: SVG seal with rough-edge displacement filter, multiply blend, spring thump.
- **Order timeline**: vertical, filled ink dots, ring on the current step; cancelled uses seal red.

## Do's and Don'ts

Do
- Keep price in seal red with tabular numerals; keep ink for anything clickable.
- Show what the system understood (chips, relaxed notice) in the shopper view; keep scores behind Inspect.
- Stamp only for confirmation moments (cart add, order placed).
- Respect reduced motion: replace movement with opacity, keep state feedback.

Don't
- Use seal red for decoration, gradients, gradient text, glass, or colored side borders.
- Use emoji or Unicode glyphs as icons (Lucide, 1.5 to 2px stroke, one set).
- Add kickers above headings or numbered sections.
- Imitate any real marketplace brand (no orange, no brand-blue-on-white identity).
