import { Backpack, Flower2, Footprints, Headphones, Shirt, Sofa, Tag, Watch, type LucideIcon } from "lucide-react";

export function categoryIcon(slug: string): LucideIcon {
  if (slug.includes("thoi-trang-nam")) return Shirt;
  if (slug.includes("thoi-trang-nu")) return Flower2;
  if (slug.includes("giay")) return Footprints;
  if (slug.includes("tui") || slug.includes("balo")) return Backpack;
  if (slug.includes("phu-kien") || slug.includes("dong-ho")) return Watch;
  if (slug.includes("cong-nghe") || slug.includes("dien")) return Headphones;
  if (slug.includes("nha")) return Sofa;
  return Tag;
}
