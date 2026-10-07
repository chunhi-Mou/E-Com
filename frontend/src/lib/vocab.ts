// Display labels for the controlled vocabulary of the product data.
export const ATTR_LABEL: Record<string, string> = {
  color: "Màu sắc",
  material: "Chất liệu",
  gender: "Đối tượng",
  season: "Mùa",
  occasion: "Dịp dùng",
  style: "Phong cách",
  warmth: "Độ ấm",
  brand: "Thương hiệu",
  category: "Danh mục",
};

export const VALUE_LABEL: Record<string, Record<string, string>> = {
  color: {
    black: "Đen", white: "Trắng", gray: "Xám", beige: "Be", brown: "Nâu", red: "Đỏ", pink: "Hồng",
    orange: "Cam", yellow: "Vàng", green: "Xanh lá", blue: "Xanh dương", navy: "Xanh navy",
    purple: "Tím", silver: "Bạc", gold: "Vàng đồng", multicolor: "Nhiều màu",
  },
  material: {
    cotton: "Cotton", wool: "Len", polyester: "Polyester", linen: "Linen", denim: "Denim", leather: "Da",
    synthetic_leather: "Da tổng hợp", silk: "Lụa", fleece: "Nỉ lông", down: "Lông vũ", nylon: "Nylon",
    knit: "Dệt kim", canvas: "Vải canvas", rubber: "Cao su", metal: "Kim loại", plastic: "Nhựa",
  },
  gender: { male: "Nam", female: "Nữ", unisex: "Unisex", kids: "Trẻ em" },
  season: { spring: "Xuân", summer: "Hè", autumn: "Thu", winter: "Đông", all_season: "Quanh năm" },
  occasion: {
    casual: "Thường ngày", office: "Công sở", sport: "Thể thao", party: "Dự tiệc", beach: "Đi biển",
    travel: "Du lịch", home: "Ở nhà", formal: "Trang trọng",
  },
  style: { basic: "Basic", streetwear: "Streetwear", vintage: "Vintage", elegant: "Thanh lịch", sporty: "Năng động", minimal: "Tối giản" },
  warmth: { low: "Mỏng nhẹ", medium: "Vừa", high: "Rất ấm" },
};

export function attrLabel(code: string): string {
  return ATTR_LABEL[code] ?? code;
}

export function valueLabel(code: string, value: string): string {
  return VALUE_LABEL[code]?.[value] ?? value;
}

// Swatch colours for the color facet (display only).
export const COLOR_HEX: Record<string, string> = {
  black: "#1b1b1f", white: "#ffffff", gray: "#9a9aa2", beige: "#d9c8aa", brown: "#7a4e30", red: "#c8322a",
  pink: "#f0a3b8", orange: "#ee8a2e", yellow: "#f1cf3a", green: "#3f8f5a", blue: "#3b7fd4", navy: "#1f2d5c",
  purple: "#7b57b8", silver: "#c4c7cc", gold: "#c9a24a", multicolor: "#c8322a",
};

export const FILTER_LABEL: Record<string, string> = {
  category: "danh mục",
  price_min: "giá tối thiểu",
  price_max: "giá tối đa",
  price: "khoảng giá",
  brand: "thương hiệu",
  color: "màu sắc",
  gender: "đối tượng",
  material: "chất liệu",
  season: "mùa",
  occasion: "dịp dùng",
  style: "phong cách",
  warmth: "độ ấm",
};
