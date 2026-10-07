import type { CartLine } from "@/lib/types";
import { cartSubtotal, shippingFor } from "@/store/cart";
import { formatVND } from "@/lib/format";

/** Receipt-style totals: label, dotted leader, amount. */
export function OrderTotals({ lines, subtotal, shipping, className = "" }: { lines?: CartLine[]; subtotal?: number; shipping?: number; className?: string }) {
  const sub = subtotal ?? cartSubtotal(lines ?? []);
  const ship = shipping ?? shippingFor(sub);
  const original = (lines ?? []).reduce((n, l) => n + (l.originalPrice ?? l.price) * l.quantity, 0);
  const saved = lines ? original - sub : 0;
  return (
    <div className={`space-y-2 text-[14px] ${className}`}>
      <div className="leader"><span className="text-muted">Tạm tính</span><span className="num">{formatVND(sub + saved)}</span></div>
      {saved > 0 && (
        <div className="leader"><span className="text-muted">Giảm giá</span><span className="num text-ok">-{formatVND(saved)}</span></div>
      )}
      <div className="leader"><span className="text-muted">Phí vận chuyển</span><span className="num">{ship === 0 ? "Miễn phí" : formatVND(ship)}</span></div>
      <div className="flex items-baseline justify-between border-t-2 border-double border-line-strong pt-3">
        <span className="text-[15px] font-bold">Tổng cộng</span>
        <span className="num text-[22px] font-bold leading-none text-seal-600">{formatVND(sub + ship)}</span>
      </div>
    </div>
  );
}
