import type { ShippingAddress } from "./types";

/** The demo login (`admin`) shops as the seeded customer C001. Replace with a real mapping when accounts exist. */
const CUSTOMER_BY_USER: Record<string, string> = { admin: "C001" };
export const customerIdFor = (username?: string | null) => CUSTOMER_BY_USER[username ?? ""] ?? "C001";

/** Seeded backend orders have no address; show a fixed sample so the detail page matches orders placed at checkout. */
const SAMPLE: Record<string, ShippingAddress> = {
  C001: { fullName: "Nguyễn Văn An", phone: "0901234567", street: "12 Nguyễn Huệ", ward: "Phường Bến Nghé", province: "TP. Hồ Chí Minh" },
};
export const sampleAddressFor = (customerId: string): ShippingAddress | undefined => SAMPLE[customerId];
