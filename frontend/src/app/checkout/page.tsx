"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote, CreditCard, Info, Loader2 } from "lucide-react";
import { PHONE_RE, PROVINCES, WARD_HINTS, newOrderCode } from "@/lib/address";
import { formatVND } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { getCachedProduct } from "@/lib/api";
import type { CartLine, PlacedOrder, Product, ShippingAddress } from "@/lib/types";
import { cartSubtotal, shippingFor, useCart } from "@/store/cart";
import { useOrders } from "@/store/orders";
import { EmptyState } from "@/components/EmptyState";
import { OrderTotals } from "@/components/OrderTotals";
import { ProductImage } from "@/components/ProductImage";

type Errors = Partial<Record<keyof ShippingAddress | "card" | "exp" | "cvc" | "cardName", string>>;

function lineToProduct(l: CartLine): Product {
  return (
    getCachedProduct(l.productId) ?? {
      id: l.productId, name: l.name, description: "", brand: null, category: l.category ?? "", category_path: [],
      price: l.price, original_price: l.originalPrice, stock: 0, rating: 0, rating_count: 0, sold_count: 0,
      attributes: {}, tags: {}, images: [l.image],
    }
  );
}

function Field({ label, error, children, hint, id }: { label: string; error?: string; hint?: string; children: React.ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-[12.5px] text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-[12.5px] font-medium text-seal-700">{error}</p>}
    </div>
  );
}

const input = (bad?: boolean) =>
  `h-11 w-full rounded-lg border bg-white px-3 text-[15px] placeholder:text-faint ${bad ? "border-seal-500 ring-1 ring-seal-500" : "border-line-strong hover:border-ink-300"}`;

export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { lines, clear } = useCart();
  const addOrder = useOrders((s) => s.add);
  const [form, setForm] = useState<ShippingAddress>({ fullName: "", phone: "", province: "", ward: "", street: "", note: "" });
  const [pay, setPay] = useState<"COD" | "CARD">("COD");
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvc: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  if (!hydrated) return <div className="shell py-8"><div className="skeleton h-72" /></div>;
  if (!lines.length && !busy) {
    return (
      <div className="shell py-10">
        <EmptyState title="Chưa có gì để thanh toán" action={<Link href="/" className="inline-flex h-11 items-center rounded-lg bg-ink-600 px-5 text-[15px] font-semibold text-white hover:bg-ink-700">Về trang chủ</Link>}>
          Giỏ hàng đang trống. Thêm sản phẩm rồi quay lại đây.
        </EmptyState>
      </div>
    );
  }

  const set = (k: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === "province" ? { ward: "" } : {}) }));

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.fullName.trim().length < 2) e.fullName = "Nhập họ và tên người nhận.";
    if (!PHONE_RE.test(form.phone.replace(/\s/g, ""))) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0 (hoặc +84).";
    if (!form.province) e.province = "Chọn tỉnh hoặc thành phố.";
    if (!form.ward.trim()) e.ward = "Nhập phường hoặc xã.";
    if (form.street.trim().length < 3) e.street = "Nhập số nhà và tên đường.";
    if (pay === "CARD") {
      if (card.number.replace(/\s/g, "").length < 13) e.card = "Số thẻ chưa đủ chữ số.";
      if (card.name.trim().length < 2) e.cardName = "Nhập tên in trên thẻ.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.exp)) e.exp = "Nhập theo dạng MM/YY.";
      if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = "Mã CVC gồm 3 hoặc 4 số.";
    }
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    const subtotal = cartSubtotal(lines);
    const shipping = shippingFor(subtotal);
    const code = newOrderCode();
    const now = new Date().toISOString();
    const order: PlacedOrder = {
      order_code: code,
      customer_id: "C-LOCAL",
      status: "PENDING",
      created_at: now,
      total: subtotal + shipping,
      items: lines.map((l) => ({ product: lineToProduct(l), quantity: l.quantity, unit_price: l.price })),
      status_history: [{ status: "PENDING", at: now }],
      address: { ...form, phone: form.phone.replace(/\s/g, "") },
      payment: pay,
      shipping_fee: shipping,
      placed_locally: true,
    };
    addOrder(order);
    clear();
    router.replace(`/orders/${code}?placed=1`);
  };

  const subtotal = cartSubtotal(lines);
  const wards = WARD_HINTS[form.province] ?? [];

  return (
    <div className="shell pb-10 pt-5">
      <h1 className="text-[24px] font-bold tracking-[-0.01em]">Thanh toán</h1>
      <form onSubmit={submit} noValidate className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-sheet p-4 md:p-5" aria-labelledby="addr">
            <h2 id="addr" className="mb-4 text-[17px] font-bold">Địa chỉ nhận hàng</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="f-fullName" label="Họ và tên" error={errors.fullName}>
                <input id="f-fullName" value={form.fullName} onChange={set("fullName")} autoComplete="name" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "f-fullName-err" : undefined} className={input(!!errors.fullName)} placeholder="Nguyễn Văn An" />
              </Field>
              <Field id="f-phone" label="Số điện thoại" error={errors.phone}>
                <input id="f-phone" value={form.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "f-phone-err" : undefined} className={`num ${input(!!errors.phone)}`} placeholder="0901 234 567" />
              </Field>
              <Field id="f-province" label="Tỉnh / Thành phố" error={errors.province}>
                <select id="f-province" value={form.province} onChange={set("province")} aria-invalid={!!errors.province} className={input(!!errors.province)}>
                  <option value="">Chọn tỉnh hoặc thành phố</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field id="f-ward" label="Phường / Xã" error={errors.ward} hint={wards.length ? "Chọn gợi ý hoặc nhập tên phường, xã của bạn." : "Nhập tên phường hoặc xã."}>
                <input id="f-ward" value={form.ward} onChange={set("ward")} list="ward-list" disabled={!form.province} aria-invalid={!!errors.ward} className={`${input(!!errors.ward)} disabled:bg-ink-50`} placeholder={form.province ? "Phường hoặc xã" : "Chọn tỉnh trước"} />
                <datalist id="ward-list">{wards.map((w) => <option key={w} value={w} />)}</datalist>
              </Field>
              <div className="sm:col-span-2">
                <Field id="f-street" label="Số nhà, tên đường" error={errors.street}>
                  <input id="f-street" value={form.street} onChange={set("street")} autoComplete="street-address" aria-invalid={!!errors.street} className={input(!!errors.street)} placeholder="12 Nguyễn Huệ" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="f-note" label="Ghi chú cho người giao (không bắt buộc)">
                  <input id="f-note" value={form.note} onChange={set("note")} className={input()} placeholder="Gọi trước khi giao" />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-sheet p-4 md:p-5" aria-labelledby="pay">
            <h2 id="pay" className="mb-3 text-[17px] font-bold">Phương thức thanh toán</h2>
            <div className="flex items-start gap-2.5 rounded-lg bg-hl-soft px-3.5 py-2.5 text-[13.5px] text-hl-ink ring-1 ring-hl">
              <Info size={17} className="mt-0.5 shrink-0" />
              <p>Đây là bản mô phỏng. Không có giao dịch thật, và thông tin thẻ không được gửi đi hay lưu lại.</p>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-labelledby="pay">
              {([
                ["COD", "Thanh toán khi nhận hàng", "Trả tiền mặt cho người giao", Banknote],
                ["CARD", "Thẻ ngân hàng (mô phỏng)", "Nhập thẻ thử, không trừ tiền", CreditCard],
              ] as const).map(([v, t, d, Icon]) => (
                <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${pay === v ? "border-ink-600 bg-ink-50 ring-1 ring-ink-600" : "border-line-strong hover:border-ink-300"}`}>
                  <input type="radio" name="pay" checked={pay === v} onChange={() => setPay(v)} className="mt-1 size-4" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-[14.5px] font-semibold"><Icon size={17} className="text-ink-600" /> {t}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{d}</span>
                  </span>
                </label>
              ))}
            </div>
            {pay === "CARD" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field id="f-card" label="Số thẻ" error={errors.card} hint="Thử số 4242 4242 4242 4242">
                    <input id="f-card" value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value.replace(/[^\d]/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim() }))} inputMode="numeric" autoComplete="off" className={`num ${input(!!errors.card)}`} placeholder="0000 0000 0000 0000" />
                  </Field>
                </div>
                <Field id="f-cardName" label="Tên trên thẻ" error={errors.cardName}>
                  <input id="f-cardName" value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.toUpperCase() }))} autoComplete="off" className={input(!!errors.cardName)} placeholder="NGUYEN VAN AN" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="f-exp" label="Hết hạn" error={errors.exp}>
                    <input id="f-exp" value={card.exp} onChange={(e) => setCard((c) => ({ ...c, exp: e.target.value.replace(/[^\d]/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2") }))} inputMode="numeric" autoComplete="off" className={`num ${input(!!errors.exp)}`} placeholder="MM/YY" />
                  </Field>
                  <Field id="f-cvc" label="CVC" error={errors.cvc}>
                    <input id="f-cvc" value={card.cvc} onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }))} inputMode="numeric" autoComplete="off" className={`num ${input(!!errors.cvc)}`} placeholder="123" />
                  </Field>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="rounded-lg border border-line bg-sheet p-4 md:p-5 lg:sticky lg:top-[calc(var(--header-h)+16px)]" aria-label="Đơn hàng của bạn">
          <h2 className="mb-3 text-[17px] font-bold">Đơn hàng của bạn</h2>
          <ul className="max-h-[300px] divide-y divide-line overflow-y-auto">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3 py-2.5">
                <span className="relative block size-12 shrink-0 overflow-hidden rounded-md border border-line"><ProductImage src={l.image} alt="" /></span>
                <span className="min-w-0 flex-1">
                  <span className="clamp-2 block text-[13px] leading-snug">{l.name}</span>
                  <span className="num text-[12.5px] text-muted">× {l.quantity}</span>
                </span>
                <span className="num text-[13.5px] font-semibold">{formatVND(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <OrderTotals lines={lines} className="mt-3 border-t border-line pt-4" />
          <button type="submit" disabled={busy} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-seal-600 text-[15px] font-semibold text-white transition-[background-color,transform] hover:bg-seal-700 active:scale-[0.98] disabled:bg-seal-400">
            {busy ? <><Loader2 size={18} className="animate-spin" /> Đang xử lý…</> : <>Đặt hàng · <span className="num">{formatVND(subtotal + shippingFor(subtotal))}</span></>}
          </button>
          <p className="mt-2.5 text-center text-[12.5px] text-muted">Bằng việc đặt hàng, bạn đồng ý đây là đơn hàng giả lập.</p>
        </aside>
      </form>
    </div>
  );
}
