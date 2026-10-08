import type { QueryRepresentation } from "@/lib/types";

/** The spoken answer never runs past this many words: the results page already shows the details. */
export const MAX_REPLY_WORDS = 7;

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Local reply used when /api/assistant/reply is unavailable. Short on purpose: it is read aloud. */
export function composeReply(rep: QueryRepresentation, total: number): string {
  const en = rep.language === "en";
  if (rep.intent !== "PRODUCT_SEARCH") return en ? "Here is your order." : "Đơn hàng của bạn đây.";
  if (total === 0) return en ? "No results, try other words." : "Chưa có kết quả, bạn thử lại nhé.";
  return en ? `Found ${total} products for you.` : `Mình tìm được ${total} sản phẩm đây.`;
}

