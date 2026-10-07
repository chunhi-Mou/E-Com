import { COLOR_HEX } from "@/lib/vocab";

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Dominant product colour of an uploaded image, as a vocabulary colour code. Used by mock mode only. */
export async function dominantColor(file: Blob): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, 32, 32);
    const { data } = ctx.getImageData(0, 0, 32, 32);
    const votes: Record<string, number> = {};
    const entries = Object.entries(COLOR_HEX).filter(([k]) => k !== "multicolor").map(([k, v]) => [k, hexRgb(v)] as const);
    // Background = average of the outer ring; pixels close to it do not vote
    let br = 0, bg = 0, bb = 0, bn = 0;
    for (let i = 0; i < 32; i++) {
      for (const [x, y] of [[i, 0], [i, 31], [0, i], [31, i]]) {
        const k = (y * 32 + x) * 4;
        br += data[k]; bg += data[k + 1]; bb += data[k + 2]; bn++;
      }
    }
    br /= bn; bg /= bn; bb /= bn;
    let counted = 0;
    for (let y = 3; y < 29; y++) {
      for (let x = 3; x < 29; x++) {
        const i = (y * 32 + x) * 4;
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        if (a < 128) continue;
        if ((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2 < 30 ** 2) continue;
        counted++;
        let best = "";
        let bd = Infinity;
        for (const [k, rgb] of entries) {
          const d = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2;
          if (d < bd) { bd = d; best = k; }
        }
        votes[best] = (votes[best] ?? 0) + 1;
      }
    }
    // Nearly everything looks like the background: a white (or black) object on a similar ground
    if (counted < 26 * 26 * 0.06) return (br + bg + bb) / 3 > 140 ? "white" : "black";
    const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : "white";
  } catch {
    return null;
  }
}
