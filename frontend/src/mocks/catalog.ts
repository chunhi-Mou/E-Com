// Mock catalog: same shapes as the backend contract. Deterministic, generated from templates.
import type { Category, CategoryRef, Product } from "@/lib/types";

type Tpl = {
  name: string;
  mat: string[];
  season: string[];
  occ: string[];
  style: string[];
  warmth?: string;
  gender: string;
  price: [number, number];
  colors: string[];
};
type Leaf = { slug: string; parent: string; name: string; kind: string; tpls: Tpl[] };

const ROOTS: { slug: string; name: string; children: { slug: string; name: string }[] }[] = [
  { slug: "thoi-trang-nam", name: "Thời trang nam", children: [{ slug: "ao-nam", name: "Áo nam" }, { slug: "quan-nam", name: "Quần nam" }] },
  { slug: "thoi-trang-nu", name: "Thời trang nữ", children: [{ slug: "ao-nu", name: "Áo nữ" }, { slug: "vay-dam", name: "Váy và đầm" }] },
  { slug: "giay-dep", name: "Giày dép", children: [] },
  { slug: "tui-balo", name: "Túi và balo", children: [] },
  { slug: "phu-kien", name: "Phụ kiện thời trang", children: [] },
  { slug: "cong-nghe", name: "Điện thoại và phụ kiện", children: [] },
  { slug: "nha-cua", name: "Nhà cửa và đời sống", children: [] },
];

const LEAVES: Leaf[] = [
  { slug: "ao-thun-nam", parent: "ao-nam", name: "Áo thun nam", kind: "tee", tpls: [
    { name: "Áo thun nam cotton cổ tròn basic", mat: ["cotton"], season: ["summer", "spring"], occ: ["casual"], style: ["basic"], warmth: "low", gender: "male", price: [99, 199], colors: ["white", "black", "navy"] },
    { name: "Áo thun nam oversize in chữ", mat: ["cotton"], season: ["summer"], occ: ["casual"], style: ["streetwear"], warmth: "low", gender: "male", price: [149, 259], colors: ["black", "gray"] },
    { name: "Áo thun nam thể thao thấm hút mồ hôi", mat: ["polyester"], season: ["summer", "all_season"], occ: ["sport"], style: ["sporty"], warmth: "low", gender: "male", price: [129, 229], colors: ["blue", "black"] },
  ] },
  { slug: "ao-len-nam", parent: "ao-nam", name: "Áo len nam", kind: "sweater", tpls: [
    { name: "Áo len cổ lọ nam dệt kim", mat: ["wool", "knit"], season: ["winter", "autumn"], occ: ["casual", "office"], style: ["minimal"], warmth: "high", gender: "male", price: [259, 459], colors: ["black", "beige", "navy"] },
    { name: "Áo len nam cổ tròn len lông cừu", mat: ["wool"], season: ["winter"], occ: ["casual"], style: ["basic"], warmth: "high", gender: "male", price: [329, 549], colors: ["gray", "brown"] },
    { name: "Áo nỉ hoodie nam có mũ", mat: ["fleece", "cotton"], season: ["winter", "autumn"], occ: ["casual"], style: ["streetwear"], warmth: "medium", gender: "male", price: [229, 389], colors: ["black", "gray"] },
  ] },
  { slug: "ao-khoac-nam", parent: "ao-nam", name: "Áo khoác nam", kind: "jacket", tpls: [
    { name: "Áo khoác phao nam siêu nhẹ chần bông", mat: ["down", "nylon"], season: ["winter"], occ: ["casual", "travel"], style: ["basic"], warmth: "high", gender: "male", price: [499, 899], colors: ["black", "navy"] },
    { name: "Áo khoác gió nam chống nước", mat: ["nylon", "polyester"], season: ["autumn", "spring"], occ: ["travel", "sport"], style: ["sporty"], warmth: "medium", gender: "male", price: [279, 459], colors: ["green", "black"] },
    { name: "Áo khoác jeans nam", mat: ["denim", "cotton"], season: ["autumn", "spring"], occ: ["casual"], style: ["vintage"], warmth: "medium", gender: "male", price: [349, 579], colors: ["blue"] },
  ] },
  { slug: "quan-jeans-nam", parent: "quan-nam", name: "Quần jeans nam", kind: "pants", tpls: [
    { name: "Quần jeans nam ống đứng co giãn", mat: ["denim", "cotton"], season: ["all_season"], occ: ["casual"], style: ["basic"], gender: "male", price: [249, 449], colors: ["blue", "black"] },
    { name: "Quần kaki nam dáng slimfit công sở", mat: ["cotton"], season: ["all_season"], occ: ["office", "formal"], style: ["elegant"], gender: "male", price: [229, 399], colors: ["beige", "navy", "gray"] },
  ] },
  { slug: "quan-short-nam", parent: "quan-nam", name: "Quần short nam", kind: "shorts", tpls: [
    { name: "Quần short nam đi biển thun lạnh", mat: ["polyester", "nylon"], season: ["summer"], occ: ["beach", "travel"], style: ["basic"], warmth: "low", gender: "male", price: [99, 189], colors: ["blue", "orange", "navy"] },
    { name: "Quần short thể thao nam 2 lớp", mat: ["polyester"], season: ["summer"], occ: ["sport"], style: ["sporty"], warmth: "low", gender: "male", price: [119, 209], colors: ["black", "gray"] },
  ] },
  { slug: "ao-thun-nu", parent: "ao-nu", name: "Áo thun nữ", kind: "tee", tpls: [
    { name: "Áo thun nữ baby tee ôm nhẹ", mat: ["cotton"], season: ["summer", "spring"], occ: ["casual"], style: ["basic"], warmth: "low", gender: "female", price: [89, 179], colors: ["white", "pink", "black"] },
    { name: "Áo thun nữ form rộng tay lỡ", mat: ["cotton"], season: ["summer"], occ: ["casual"], style: ["streetwear"], warmth: "low", gender: "female", price: [119, 219], colors: ["beige", "white"] },
  ] },
  { slug: "ao-len-nu", parent: "ao-nu", name: "Áo len nữ", kind: "sweater", tpls: [
    { name: "Áo len nữ cổ tròn dệt kim mềm", mat: ["wool", "knit"], season: ["winter", "autumn"], occ: ["casual", "office"], style: ["elegant"], warmth: "high", gender: "female", price: [239, 429], colors: ["pink", "beige", "white"] },
    { name: "Áo len nữ cardigan cổ V", mat: ["knit", "wool"], season: ["autumn", "winter"], occ: ["office", "casual"], style: ["minimal"], warmth: "medium", gender: "female", price: [269, 459], colors: ["gray", "brown"] },
  ] },
  { slug: "ao-khoac-nu", parent: "ao-nu", name: "Áo khoác nữ", kind: "jacket", tpls: [
    { name: "Áo khoác phao nữ dáng ngắn", mat: ["down", "nylon"], season: ["winter"], occ: ["casual", "travel"], style: ["streetwear"], warmth: "high", gender: "female", price: [459, 799], colors: ["white", "pink", "black"] },
    { name: "Áo khoác dù nữ chống nắng", mat: ["nylon"], season: ["summer", "spring"], occ: ["travel", "beach"], style: ["basic"], warmth: "low", gender: "female", price: [149, 279], colors: ["beige", "black"] },
  ] },
  { slug: "dam-vay", parent: "vay-dam", name: "Váy và đầm", kind: "dress", tpls: [
    { name: "Đầm maxi đi biển hoa nhí", mat: ["polyester", "linen"], season: ["summer"], occ: ["beach", "travel"], style: ["vintage"], warmth: "low", gender: "female", price: [229, 429], colors: ["yellow", "blue", "pink"] },
    { name: "Đầm công sở chữ A tay lỡ", mat: ["polyester"], season: ["all_season"], occ: ["office", "formal"], style: ["elegant"], gender: "female", price: [289, 529], colors: ["black", "navy"] },
    { name: "Váy dự tiệc ôm eo xếp ly", mat: ["silk", "polyester"], season: ["all_season"], occ: ["party", "formal"], style: ["elegant"], gender: "female", price: [349, 649], colors: ["red", "purple"] },
  ] },
  { slug: "giay-the-thao", parent: "giay-dep", name: "Giày thể thao", kind: "sneaker", tpls: [
    { name: "Giày sneaker nam nữ trắng basic", mat: ["synthetic_leather", "rubber"], season: ["all_season"], occ: ["casual"], style: ["basic", "minimal"], gender: "unisex", price: [299, 549], colors: ["white", "black"] },
    { name: "Giày chạy bộ đế êm thoáng khí", mat: ["polyester", "rubber"], season: ["all_season"], occ: ["sport"], style: ["sporty"], gender: "unisex", price: [399, 749], colors: ["gray", "orange", "blue"] },
  ] },
  { slug: "giay-da", parent: "giay-dep", name: "Giày da", kind: "loafer", tpls: [
    { name: "Giày lười nam da bò công sở", mat: ["leather"], season: ["all_season"], occ: ["office", "formal"], style: ["elegant"], gender: "male", price: [499, 899], colors: ["brown", "black"] },
    { name: "Giày búp bê nữ da mềm mũi tròn", mat: ["synthetic_leather"], season: ["all_season"], occ: ["office", "casual"], style: ["elegant"], gender: "female", price: [249, 449], colors: ["beige", "black", "red"] },
  ] },
  { slug: "dep-sandal", parent: "giay-dep", name: "Dép và sandal", kind: "sandal", tpls: [
    { name: "Sandal quai ngang đi biển chống trượt", mat: ["rubber", "plastic"], season: ["summer"], occ: ["beach", "travel"], style: ["basic"], warmth: "low", gender: "unisex", price: [89, 189], colors: ["black", "white", "blue"] },
    { name: "Dép quai hậu nữ đế bệt", mat: ["synthetic_leather"], season: ["summer", "spring"], occ: ["casual"], style: ["minimal"], gender: "female", price: [159, 289], colors: ["beige", "brown"] },
  ] },
  { slug: "balo", parent: "tui-balo", name: "Balo", kind: "backpack", tpls: [
    { name: "Balo laptop 15.6 inch chống nước", mat: ["nylon", "polyester"], season: ["all_season"], occ: ["office", "travel"], style: ["minimal"], gender: "unisex", price: [249, 489], colors: ["black", "gray", "navy"] },
    { name: "Balo canvas đi học phong cách vintage", mat: ["canvas"], season: ["all_season"], occ: ["casual"], style: ["vintage"], gender: "unisex", price: [199, 349], colors: ["green", "brown"] },
  ] },
  { slug: "tui-xach-nu", parent: "tui-balo", name: "Túi xách nữ", kind: "handbag", tpls: [
    { name: "Túi xách nữ da PU quai xách", mat: ["synthetic_leather"], season: ["all_season"], occ: ["office", "party"], style: ["elegant"], gender: "female", price: [269, 549], colors: ["red", "beige", "black"] },
    { name: "Túi tote vải canvas đeo vai", mat: ["canvas", "cotton"], season: ["all_season"], occ: ["casual", "beach"], style: ["minimal"], gender: "female", price: [129, 239], colors: ["white", "beige"] },
  ] },
  { slug: "kinh-mat", parent: "phu-kien", name: "Kính mát", kind: "sunglasses", tpls: [
    { name: "Kính mát phân cực chống tia UV400", mat: ["plastic", "metal"], season: ["summer"], occ: ["beach", "travel"], style: ["basic"], warmth: "low", gender: "unisex", price: [149, 329], colors: ["black", "brown", "gold"] },
  ] },
  { slug: "mu-non", parent: "phu-kien", name: "Mũ nón", kind: "cap", tpls: [
    { name: "Mũ lưỡi trai thêu chữ unisex", mat: ["cotton"], season: ["summer", "spring"], occ: ["casual", "sport"], style: ["streetwear"], gender: "unisex", price: [79, 169], colors: ["black", "white", "navy"] },
    { name: "Nón len beanie giữ ấm", mat: ["wool", "knit"], season: ["winter"], occ: ["casual"], style: ["basic"], warmth: "high", gender: "unisex", price: [79, 159], colors: ["gray", "red", "black"] },
  ] },
  { slug: "dong-ho", parent: "phu-kien", name: "Đồng hồ", kind: "watch", tpls: [
    { name: "Đồng hồ nam dây da mặt tròn tối giản", mat: ["leather", "metal"], season: ["all_season"], occ: ["office", "formal"], style: ["minimal", "elegant"], gender: "male", price: [599, 1290], colors: ["brown", "silver", "black"] },
    { name: "Đồng hồ điện tử thể thao chống nước", mat: ["plastic", "rubber"], season: ["all_season"], occ: ["sport"], style: ["sporty"], gender: "unisex", price: [399, 890], colors: ["black", "green"] },
  ] },
  { slug: "tai-nghe", parent: "cong-nghe", name: "Tai nghe", kind: "earbuds", tpls: [
    { name: "Tai nghe bluetooth không dây chống ồn", mat: ["plastic"], season: ["all_season"], occ: ["travel", "sport"], style: ["minimal"], gender: "unisex", price: [349, 990], colors: ["white", "black", "pink"] },
  ] },
  { slug: "sac-du-phong", parent: "cong-nghe", name: "Sạc dự phòng", kind: "powerbank", tpls: [
    { name: "Sạc dự phòng 10.000mAh sạc nhanh", mat: ["plastic", "metal"], season: ["all_season"], occ: ["travel"], style: ["minimal"], gender: "unisex", price: [249, 459], colors: ["white", "black", "blue"] },
  ] },
  { slug: "binh-giu-nhiet", parent: "nha-cua", name: "Bình giữ nhiệt", kind: "bottle", tpls: [
    { name: "Bình giữ nhiệt inox 500ml", mat: ["metal"], season: ["all_season"], occ: ["office", "travel", "sport"], style: ["minimal"], gender: "unisex", price: [129, 289], colors: ["silver", "black", "green", "pink"] },
  ] },
  { slug: "chan-mem", parent: "nha-cua", name: "Chăn và gối", kind: "blanket", tpls: [
    { name: "Chăn lông cừu nhân tạo siêu ấm", mat: ["fleece", "polyester"], season: ["winter"], occ: ["home"], style: ["basic"], warmth: "high", gender: "unisex", price: [279, 589], colors: ["beige", "gray", "brown"] },
    { name: "Chăn đũi hè thoáng mát", mat: ["linen", "cotton"], season: ["summer"], occ: ["home"], style: ["minimal"], warmth: "low", gender: "unisex", price: [199, 399], colors: ["white", "blue"] },
  ] },
];

const BRANDS = ["Mộc Studio", "Nắng Sài Gòn", "Phố Cổ Wear", "Bờ Biển", "Urban Việt", "Tre Xanh", "Basic Lab", "Hà Nội Knit", "Sông Hương", "Lục Bình"];

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLOR_NAME_VI: Record<string, string> = {
  black: "đen", white: "trắng", gray: "xám", beige: "be", brown: "nâu", red: "đỏ", pink: "hồng", orange: "cam",
  yellow: "vàng", green: "xanh lá", blue: "xanh dương", navy: "xanh navy", purple: "tím", silver: "bạc", gold: "vàng đồng",
};

export const categories: Category[] = [
  ...ROOTS.map((r) => ({ slug: r.slug, parent: null, name: r.name })),
  ...ROOTS.flatMap((r) => r.children.map((c) => ({ slug: c.slug, parent: r.slug, name: c.name }))),
  ...LEAVES.map((l) => ({ slug: l.slug, parent: l.parent, name: l.name })),
];

const catBySlug = new Map(categories.map((c) => [c.slug, c]));

export function categoryPath(slug: string): CategoryRef[] {
  const out: CategoryRef[] = [];
  let cur = catBySlug.get(slug);
  while (cur) {
    out.unshift({ slug: cur.slug, name: cur.name });
    cur = cur.parent ? catBySlug.get(cur.parent) : undefined;
  }
  return out;
}

export function descendants(slug: string): string[] {
  const out = [slug];
  for (const c of categories) if (c.parent && out.includes(c.parent) && !out.includes(c.slug)) out.push(c.slug);
  // second pass handles three-level trees
  for (const c of categories) if (c.parent && out.includes(c.parent) && !out.includes(c.slug)) out.push(c.slug);
  return out;
}

export const KIND_OF_CATEGORY: Record<string, string> = Object.fromEntries(LEAVES.map((l) => [l.slug, l.kind]));

function build(): Product[] {
  const rand = rng(20261007);
  const out: Product[] = [];
  let n = 0;
  for (const leaf of LEAVES) {
    for (const t of leaf.tpls) {
      for (const color of t.colors) {
        n += 1;
        const id = `P${String(n).padStart(6, "0")}`;
        const price = Math.round((t.price[0] + rand() * (t.price[1] - t.price[0])) / 10) * 10 * 1000;
        const hasOrig = rand() < 0.62;
        const original = hasOrig ? Math.round((price * (1.15 + rand() * 0.45)) / 1000) * 1000 : null;
        const sold = Math.floor(Math.pow(rand(), 2.2) * 6200) + 12;
        const attrs: Record<string, string[]> = {
          color: [color],
          material: t.mat,
          gender: [t.gender],
        };
        const kind = leaf.kind;
        const images = [0, 1, 2].map((v) => `/mock-img/${kind}/${color}.svg?v=${v}`);
        out.push({
          id,
          name: `${t.name} màu ${COLOR_NAME_VI[color] ?? color}`,
          description: `${t.name}, màu ${COLOR_NAME_VI[color] ?? color}. Chất liệu ${t.mat.join(", ")}, phù hợp ${t.occ.join(", ")}.`,
          brand: rand() < 0.9 ? BRANDS[Math.floor(rand() * BRANDS.length)] : null,
          category: leaf.slug,
          category_path: categoryPath(leaf.slug),
          price,
          original_price: original,
          stock: Math.floor(rand() * 90) + 3,
          rating: Math.round((3.9 + rand() * 1.05) * 10) / 10,
          rating_count: Math.floor(sold * (0.08 + rand() * 0.2)),
          sold_count: sold,
          attributes: attrs,
          tags: {
            season: t.season,
            occasion: t.occ,
            style: t.style,
            ...(t.warmth ? { warmth: [t.warmth] } : {}),
          },
          images,
        });
      }
    }
  }
  return out;
}

export const products: Product[] = build();
export const productById = new Map(products.map((p) => [p.id, p]));
