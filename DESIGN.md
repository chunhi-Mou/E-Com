---
name: Lumina
description: Vietnamese marketplace storefront whose signature is multimodal search (type, speak, show a photo). White and grey surfaces with one violet accent used sparingly.
colors:
  ink-50: "#F8F5FF"
  ink-100: "#EFE9FF"
  ink-200: "#DDD2FE"
  ink-300: "#C4B2FC"
  ink-500: "#8B5CF6"
  ink-600: "#6D3AE8"
  ink-700: "#5B2BD0"
  ink-800: "#2E1B6B"
  ink-950: "#0E0826"
  paper: "#F6F6F9"
  sheet: "#FFFFFF"
  line: "#E8E8EF"
  line-strong: "#D3D3DF"
  fg: "#14131A"
  muted: "#666574"
  faint: "#9A99A9"
  ok: "#10B981"
  star: "#F59E0B"
typography:
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  display:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 5.4vw, 4.1rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    letterSpacing: "-0.03em"
  price:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "-0.02em"
rounded:
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  pill: "9999px"
components:
  header:
    backgroundColor: "rgb(255 255 255 / 0.85)"
    backdropFilter: "blur(24px)"
    height: "64px + 44px category row"
  search-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.fg}"
    rounded: "{rounded.2xl}"
    height: "48px"
  button-primary:
    backgroundColor: "{colors.ink-600}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.xl}"
    height: "48px"
  product-card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.2xl}"
  promo-band:
    backgroundColor: "{colors.ink-600}"
    textColor: "{colors.sheet}"
    rounded: "28px"
---

## Overview

Lumina is an Operate surface: shoppers scan, compare and buy, so the shell stays familiar (search-first header, category entry, product grid). What changed from the first version is the surface: calm white and grey, big type, generous space, and motion that explains what is happening.

The signature is the search itself: text, voice and image share one field. The system's understanding is shown as "Lumina hiểu" chips, and an Inspect toggle (for the lecturer) exposes the query representation and per-item score bars.

Light theme only. Scene: a shopper on a phone or laptop in daylight, comparing prices.

## Colors

Strategy: neutral first, one accent, used rarely so it lands.

- **Neutrals** carry the whole interface: `paper` ground, `sheet` white cards, `line` hairlines, `fg` text. They lean slightly cool and violet; no pure black.
- **Violet (ink-600)** appears only for: the primary action (search, sign in, buy), focus and active states, the logo, one highlighted phrase in a headline, and one saturated block per screen (the promo band on Home, the curtain on login).
- **ink-800 and up** are rare dark surfaces: the Inspect header, the voice panel header, toasts.
- **seal-\*** is an alias of the same violet kept so older class names keep working. There is no red in the interface; errors use a rose notice with text and an icon.
- Price is `fg`, never accent. A discount is shown as a violet-tinted pill, not by colouring the price.

## Typography

- **Be Vietnam Pro** (400 to 800) for everything. It is designed for Vietnamese diacritics, so stacked marks stay legible at small sizes.
- Headlines are 800 weight with tight tracking (-0.03em to -0.04em). Body copy stays at 15 to 17px with `text-wrap: pretty`; headings use `balance`.
- Numerals use tabular figures (`.num`); money is `299.000 ₫`. Dates are `07/10/2026`.
- No gradient text, no condensed or monospace display type.

## Layout

- 1360px max shell, 16px gutter on phones, 24px from 768px.
- Home order: hero (headline, three ways to search, photo tiles with a floating "Lumina hiểu" card), category cards, deals rail, violet promo band, best sellers, three category rows.
- Product grids: 2 columns on phones, 3 at 640px, 5 from 1024px.
- Login is a split screen: form on the left, a looping demo of the three search modes on the right (hidden on phones).
- Header is sticky and translucent; on phones the logo row scrolls away and the search row stays.

## Elevation & Depth

Hairline borders on white cards at rest. Hover lifts a card 4px with a soft violet-tinted shadow (`shadow-lift`). Popovers and the voice panel use `shadow-pop`. The header is translucent with blur and gains a shadow once the page scrolls. The page dims (ink-950 at 40%) only while the search dropdown is open.

## Shapes

16px for cards and inputs, 20px for the search field and popovers, 26 to 28px for hero tiles and the promo band, full pill for chips and badges. The logo is a rounded square with a lens mark.

## Motion

Motion explains state; it never decorates a wait.

- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (expo out) for entrances and hovers, `cubic-bezier(0.76, 0, 0.24, 1)` for wipes and curtains.
- **Intro** (login, once per session, about 3s): mark springs in, the name rises, then "Tìm bằng" cycles lời nói, hình ảnh, văn bản and lands on "cách bạn muốn" before the screen wipes upward. Click, Enter, Space or Esc skips it; reduced-motion users never see it.
- **Login to Home curtain** (about 1.7s): a violet circle grows from the sign-in button, the route changes underneath, then the circle shrinks into the search field while the header and hero arrive. It lives in the root layout (`RouteCurtain`, `store/curtain.ts`) so it survives the route change.
- **Home**: hero lines stagger in, tiles drift slowly, sections reveal on first scroll into view (`Reveal`).
- **Cards and buttons**: hover lift, press scale 0.95 to 0.985, quick-add button slides in.
- **Reduced motion**: global rule collapses durations; `MotionConfig reducedMotion="user"` removes transforms.

## Components

- **Search field**: grey at rest, white with a violet ring and soft glow on focus, grows from 640 to 780px (spring). Holds an image chip, input, clear, camera, mic and the violet submit button. While recording it becomes a listening view with a pulsing mic, 24 level bars, live transcript and VI/EN switch. Other parts of the page can drive it with a `lumina:search` window event (`focus`, `voice`, `image`).
- **Dropdown**: recent searches, example queries, two rows for "Nói để tìm" and "Tìm bằng ảnh".
- **Product card**: square image, two-line name, bold price, rating and sold count, discount pill, hover quick-add. With Inspect on, a score block (text, image, business, soft, final).
- **Understood chips**: hard filters are solid outlined chips with a remove button; soft preferences are dashed; relaxed filters are struck through with an "đã nới" tag.
- **Promo band**: the one saturated violet block on Home, with expanding sound-wave rings around a mic.
- **Confirm mark**: violet disc, a ring that bursts outward and a check that draws itself. Used when an item is added to the cart and when an order is placed.
- **Order timeline**: vertical, filled violet dots, ring on the current step.

## Do's and Don'ts

Do
- Keep violet for actions, focus and one bold moment per screen; keep everything else white and grey.
- Show what the system understood (chips, relaxed notice) in the shopper view; keep scores behind Inspect.
- Respect reduced motion: replace movement with opacity, keep state feedback.

Don't
- Use gradient text, glows, orbit rings, particle backgrounds or grids as decoration.
- Colour prices; use red anywhere except destructive or error text.
- Use emoji or Unicode glyphs as icons (Lucide, 1.5 to 2px stroke, one set).
- Play sound, or run an animation longer than about 3 seconds without a skip.
- Imitate any real marketplace brand.
