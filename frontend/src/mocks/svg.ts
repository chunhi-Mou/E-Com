// Neutral generated product placeholders (no stock photos). One silhouette per product kind.
import { COLOR_HEX } from "@/lib/vocab";

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function lum([r, g, b]: RGB): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export const KINDS = [
  "tee", "sweater", "jacket", "pants", "shorts", "dress", "sneaker", "loafer", "sandal",
  "backpack", "handbag", "sunglasses", "cap", "watch", "earbuds", "powerbank", "bottle", "blanket",
] as const;
export type Kind = (typeof KINDS)[number];

type Pal = { base: string; shade: string; light: string; dark: string };

function shape(kind: Kind, p: Pal): string {
  const { base: B, shade: S, light: L, dark: D } = p;
  switch (kind) {
    case "tee":
      return `<path d="M128 92 L170 72 Q200 100 230 72 L272 92 L336 142 L304 184 L272 162 L272 332 L128 332 L128 162 L96 184 L64 142 Z" fill="${B}"/>
<path d="M170 72 Q200 100 230 72 Q226 96 200 106 Q174 96 170 72Z" fill="${S}"/>
<path d="M128 162 L128 332 L150 332 L150 150Z" fill="${S}" opacity=".35"/>
<path d="M96 184 L128 162 M304 184 L272 162" stroke="${S}" stroke-width="2" fill="none"/>`;
    case "sweater":
      return `<path d="M138 84 Q200 126 262 84 L322 118 L356 288 L312 298 L284 186 L284 330 L116 330 L116 186 L88 298 L44 288 L78 118 Z" fill="${B}"/>
<path d="M138 84 Q200 126 262 84 L262 64 Q200 98 138 64Z" fill="${S}"/>
<rect x="116" y="304" width="168" height="26" fill="${S}"/>
<path d="M44 288 L88 298 L84 318 L38 308Z M356 288 L312 298 L316 318 L362 308Z" fill="${S}"/>
<g stroke="${D}" stroke-opacity=".14" stroke-width="2">${Array.from({ length: 9 }, (_, i) => `<path d="M${130 + i * 17} 140 V300"/>`).join("")}</g>
<path d="M116 186 L116 330 L136 330 L136 170Z" fill="${D}" opacity=".12"/>`;
    case "jacket":
      return `<path d="M132 78 Q200 112 268 78 L330 112 L362 290 L318 300 L288 190 L288 334 L112 334 L112 190 L82 300 L38 290 L70 112 Z" fill="${B}"/>
<path d="M132 78 Q200 112 268 78 L268 52 Q200 84 132 52Z" fill="${S}"/>
<g stroke="${D}" stroke-opacity=".28" stroke-width="3" fill="none"><path d="M112 150 H288 M112 200 H288 M112 250 H288 M112 300 H288"/></g>
<path d="M200 98 V334" stroke="${L}" stroke-width="4" stroke-opacity=".7"/>
<rect x="194" y="98" width="12" height="20" rx="3" fill="${D}" opacity=".6"/>`;
    case "pants":
      return `<path d="M138 56 H262 L282 346 H214 L200 138 L186 346 H118 Z" fill="${B}"/>
<rect x="138" y="56" width="124" height="22" fill="${S}"/>
<path d="M200 78 V138" stroke="${D}" stroke-opacity=".3" stroke-width="2"/>
<path d="M150 90 Q164 118 172 112 M250 90 Q236 118 228 112" stroke="${D}" stroke-opacity=".3" stroke-width="2" fill="none"/>
<path d="M118 346 H186 L188 330 H120Z M214 346 H282 L280 330 H212Z" fill="${S}" opacity=".6"/>`;
    case "shorts":
      return `<path d="M134 96 H266 L292 262 H212 L200 168 L188 262 H108 Z" fill="${B}"/>
<rect x="134" y="96" width="132" height="24" fill="${S}"/>
<path d="M170 120 V150 M230 120 V150" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
<path d="M108 262 H188 L186 246 H112Z M212 262 H292 L288 246 H214Z" fill="${S}" opacity=".6"/>`;
    case "dress":
      return `<path d="M164 56 L180 56 Q200 88 220 56 L236 56 L246 168 L306 346 H94 L154 168 Z" fill="${B}"/>
<path d="M180 56 Q200 88 220 56 Q216 82 200 92 Q184 82 180 56Z" fill="${S}"/>
<path d="M154 168 H246 L249 188 H151Z" fill="${S}"/>
<g stroke="${D}" stroke-opacity=".14" stroke-width="2">${[0, 1, 2, 3, 4].map((i) => `<path d="M${176 + i * 12} 188 L${130 + i * 35} 346"/>`).join("")}</g>`;
    case "sneaker":
      return `<path d="M54 252 Q54 204 98 192 L164 168 Q196 192 238 198 L328 218 Q352 228 352 262 L352 288 H54Z" fill="${B}"/>
<path d="M54 282 H356 V310 Q356 318 346 318 H66 Q54 318 54 308Z" fill="${L}"/>
<path d="M54 282 H356 V292 H54Z" fill="${S}" opacity=".5"/>
<path d="M164 168 Q196 192 238 198 L230 214 Q190 208 156 184Z" fill="${S}"/>
<g stroke="${L}" stroke-width="4" stroke-linecap="round"><path d="M178 190 L192 176 M200 198 L214 184 M222 204 L236 190"/></g>
<path d="M70 262 Q150 236 250 258" stroke="${L}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".85"/>`;
    case "loafer":
      return `<path d="M60 246 Q76 196 136 196 L196 222 L330 240 Q364 250 354 280 H60Z" fill="${B}"/>
<path d="M60 278 H356 V292 H60Z" fill="${D}" opacity=".75"/>
<rect x="60" y="292" width="64" height="12" rx="3" fill="${D}" opacity=".85"/>
<path d="M136 196 Q170 214 196 222 L200 244 Q150 236 120 214Z" fill="${S}"/>
<path d="M214 232 Q262 238 290 246" stroke="${L}" stroke-width="3" stroke-opacity=".7" fill="none" stroke-linecap="round"/>`;
    case "sandal":
      return `<path d="M56 274 Q96 252 200 256 Q322 256 352 276 Q354 298 322 298 H88 Q52 298 56 274Z" fill="${S}"/>
<path d="M56 274 Q96 252 200 256 Q322 256 352 276 Q350 270 322 266 Q200 250 90 266 Q64 270 56 274Z" fill="${L}" opacity=".6"/>
<path d="M148 262 L186 206 L232 262" stroke="${B}" stroke-width="20" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
<path d="M120 270 Q200 236 280 270" stroke="${B}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
    case "backpack":
      return `<path d="M158 96 Q158 56 200 56 Q242 56 242 96" stroke="${S}" stroke-width="14" fill="none" stroke-linecap="round"/>
<rect x="112" y="88" width="176" height="244" rx="52" fill="${B}"/>
<rect x="140" y="212" width="120" height="92" rx="22" fill="${S}"/>
<path d="M140 232 H260" stroke="${D}" stroke-opacity=".35" stroke-width="3"/>
<path d="M150 134 Q200 120 250 134" stroke="${D}" stroke-opacity=".35" stroke-width="3" fill="none"/>
<rect x="188" y="228" width="24" height="10" rx="4" fill="${L}"/>
<path d="M112 160 Q92 200 112 250 M288 160 Q308 200 288 250" stroke="${S}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
    case "handbag":
      return `<path d="M142 176 Q142 78 200 78 Q258 78 258 176" stroke="${S}" stroke-width="14" fill="none" stroke-linecap="round"/>
<path d="M92 172 H308 L338 322 Q340 336 326 336 H74 Q60 336 62 322Z" fill="${B}"/>
<path d="M92 172 H308 L312 196 H88Z" fill="${S}"/>
<rect x="184" y="196" width="32" height="26" rx="6" fill="${L}"/>
<path d="M76 262 H324" stroke="${D}" stroke-opacity=".18" stroke-width="2"/>`;
    case "sunglasses":
      return `<path d="M52 190 H110 M290 190 H348" stroke="${S}" stroke-width="10" stroke-linecap="round"/>
<path d="M52 190 L60 250" stroke="${S}" stroke-width="10" stroke-linecap="round"/>
<path d="M82 168 H174 Q192 168 190 190 Q184 244 148 248 H104 Q76 246 72 200Z" fill="${B}"/>
<path d="M226 168 H318 Q328 200 324 200 Q320 246 296 248 H252 Q216 244 210 190 Q208 168 226 168Z" fill="${B}"/>
<path d="M190 188 Q200 176 210 188" stroke="${S}" stroke-width="8" fill="none" stroke-linecap="round"/>
<path d="M92 184 L120 182 M236 184 L264 182" stroke="${L}" stroke-width="5" stroke-linecap="round" opacity=".6"/>`;
    case "cap":
      return `<path d="M100 236 Q100 118 200 118 Q300 118 300 236Z" fill="${B}"/>
<path d="M200 118 V236 M150 130 Q140 190 142 236 M250 130 Q260 190 258 236" stroke="${D}" stroke-opacity=".2" stroke-width="2" fill="none"/>
<path d="M96 236 H300 Q372 240 364 268 Q300 262 232 256 L100 252Z" fill="${S}"/>
<circle cx="200" cy="118" r="9" fill="${S}"/>`;
    case "watch":
      return `<path d="M164 40 H236 L246 130 H154Z M154 270 H246 L236 360 H164Z" fill="${S}"/>
<circle cx="200" cy="200" r="86" fill="${D}" opacity=".85"/>
<circle cx="200" cy="200" r="72" fill="${L}"/>
<circle cx="200" cy="200" r="72" fill="none" stroke="${B}" stroke-width="3"/>
<path d="M200 200 V150 M200 200 L232 216" stroke="${D}" stroke-width="5" stroke-linecap="round"/>
<g stroke="${D}" stroke-width="3" stroke-linecap="round"><path d="M200 136 V144 M200 256 V264 M136 200 H144 M256 200 H264"/></g>
<rect x="284" y="192" width="14" height="16" rx="3" fill="${B}"/>`;
    case "earbuds":
      return `<rect x="96" y="168" width="208" height="150" rx="46" fill="${B}"/>
<path d="M96 222 H304" stroke="${D}" stroke-opacity=".3" stroke-width="3"/>
<circle cx="200" cy="270" r="9" fill="${L}"/>
<g><circle cx="150" cy="116" r="30" fill="${S}"/><rect x="138" y="130" width="14" height="46" rx="7" fill="${S}"/>
<circle cx="250" cy="116" r="30" fill="${S}"/><rect x="248" y="130" width="14" height="46" rx="7" fill="${S}"/></g>`;
    case "powerbank":
      return `<rect x="110" y="62" width="180" height="276" rx="30" fill="${B}"/>
<rect x="110" y="62" width="180" height="60" rx="30" fill="${S}"/>
<rect x="174" y="62" width="52" height="14" rx="5" fill="${D}" opacity=".7"/>
<g fill="${L}">${[0, 1, 2, 3].map((i) => `<circle cx="${156 + i * 30}" cy="160" r="7"/>`).join("")}</g>
<path d="M200 214 L178 262 H198 L190 304 L222 250 H202Z" fill="${L}" opacity=".85"/>`;
    case "bottle":
      return `<rect x="168" y="40" width="64" height="40" rx="10" fill="${S}"/>
<path d="M156 80 H244 V108 Q262 124 262 150 V332 Q262 354 240 354 H160 Q138 354 138 332 V150 Q138 124 156 108Z" fill="${B}"/>
<rect x="138" y="196" width="124" height="70" fill="${S}" opacity=".5"/>
<path d="M156 130 V330" stroke="${L}" stroke-width="6" stroke-linecap="round" opacity=".55"/>`;
    case "blanket":
      return `<rect x="70" y="250" width="260" height="70" rx="14" fill="${S}"/>
<rect x="76" y="188" width="248" height="70" rx="14" fill="${B}"/>
<rect x="84" y="128" width="232" height="68" rx="14" fill="${L}"/>
<g stroke="${D}" stroke-opacity=".18" stroke-width="3"><path d="M96 150 H304 M96 170 H304 M92 210 H308 M92 230 H308 M86 272 H314 M86 292 H314"/></g>`;
  }
}

export function productSvg(kind: string, colorCode: string, view = 0): string {
  const k = (KINDS as readonly string[]).includes(kind) ? (kind as Kind) : "tee";
  const hex = COLOR_HEX[colorCode] ?? "#8a8aa0";
  const rgb = hexToRgb(hex);
  const dark = lum(rgb) < 0.35;
  const pal: Pal = {
    base: hex,
    shade: rgbToHex(mix(rgb, [0, 0, 0], dark ? -0.0 : 0.18)),
    light: rgbToHex(mix(rgb, [255, 255, 255], dark ? 0.35 : 0.55)),
    dark: rgbToHex(mix(rgb, [10, 10, 30], 0.55)),
  };
  if (dark) pal.shade = rgbToHex(mix(rgb, [255, 255, 255], 0.12));
  const bg = view === 2 ? "#e4e1f4" : lum(rgb) > 0.8 ? "#e9e7f1" : rgbToHex(mix([246, 245, 250], rgb, 0.1));
  const body = shape(k, pal);
  const t =
    view === 1
      ? 'transform="translate(-130 -90) scale(1.65)"'
      : view === 2
        ? 'transform="rotate(-5 200 200) translate(8 4)"'
        : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800" role="img">
<rect width="400" height="400" fill="${bg}"/>
<ellipse cx="200" cy="356" rx="${view === 1 ? 0 : 118}" ry="10" fill="#1a1740" opacity=".12"/>
<g ${t}>${body}</g>
</svg>`;
}
