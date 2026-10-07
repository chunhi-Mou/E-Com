import type { QueryRepresentation } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { attrLabel, valueLabel } from "@/lib/vocab";

/** Local reply used when /api/assistant/reply is unavailable. Short on purpose: it is read aloud. */
export function composeReply(rep: QueryRepresentation, total: number, topNames: string[]): string {
  const en = rep.language === "en";
  if (rep.intent !== "PRODUCT_SEARCH") {
    return en ? "Here is the order I found." : "Đây là đơn hàng mình tìm được.";
  }
  if (total === 0) {
    return en
      ? "I could not find a match. Try fewer words or a different colour."
      : "Mình chưa tìm thấy sản phẩm phù hợp. Bạn thử bớt từ khóa hoặc đổi màu nhé.";
  }
  const parts: string[] = [];
  const h = rep.hard_filters;
  if (h.price_max) parts.push(en ? `under ${formatVND(h.price_max)}` : `giá dưới ${formatVND(h.price_max)}`);
  if (h.price_min && !h.price_max) parts.push(en ? `over ${formatVND(h.price_min)}` : `giá từ ${formatVND(h.price_min)}`);
  const color = (h.color as string[] | undefined)?.[0];
  if (color) parts.push(en ? `colour ${color}` : `màu ${valueLabel("color", color).toLowerCase()}`);
  const season = rep.soft_preferences.season?.[0];
  if (season) parts.push(`${attrLabel("season").toLowerCase()} ${valueLabel("season", season).toLowerCase()}`);
  const lead = topNames[0] ? (en ? ` Top pick: ${topNames[0]}.` : ` Gợi ý đầu tiên là ${topNames[0]}.`) : "";
  const cond = parts.length ? ` (${parts.join(", ")})` : "";
  return en
    ? `I found ${total} products${cond}.${lead}`
    : `Mình tìm thấy ${total} sản phẩm${cond}.${lead}`;
}

/** Marketplace titles are stuffed with keywords. For speech keep the part before the first separator, at most 8 words. */
export function spokenName(name: string): string {
  const head = name.split(/\s[-–—|/]\s|[,(\[]/)[0].trim() || name.trim();
  return head.split(/\s+/).slice(0, 8).join(" ");
}
