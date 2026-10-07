// Vietnam two-level address (province or centrally-run city, then ward or commune), 34 units since 2025.
export const PROVINCES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Hải Phòng", "Đà Nẵng", "Cần Thơ", "Huế", "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng",
  "Đắk Lắk", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Tĩnh", "Hưng Yên", "Khánh Hòa", "Lai Châu", "Lâm Đồng",
  "Lạng Sơn", "Lào Cai", "Nghệ An", "Ninh Bình", "Phú Thọ", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh",
  "Thái Nguyên", "Thanh Hóa", "Tuyên Quang", "Vĩnh Long",
];

// Suggestions only; the ward field accepts free text because the full list is large.
export const WARD_HINTS: Record<string, string[]> = {
  "Hà Nội": ["Phường Hoàn Kiếm", "Phường Ba Đình", "Phường Cầu Giấy", "Phường Đống Đa", "Phường Hai Bà Trưng", "Phường Tây Hồ", "Phường Thanh Xuân", "Phường Hà Đông"],
  "TP. Hồ Chí Minh": ["Phường Sài Gòn", "Phường Bến Thành", "Phường Tân Định", "Phường Bình Thạnh", "Phường Gò Vấp", "Phường Thủ Đức", "Phường Tân Sơn Nhất", "Phường Phú Nhuận"],
  "Đà Nẵng": ["Phường Hải Châu", "Phường Thanh Khê", "Phường Sơn Trà", "Phường Ngũ Hành Sơn", "Phường Liên Chiểu", "Phường Hòa Khánh"],
  "Hải Phòng": ["Phường Hồng Bàng", "Phường Ngô Quyền", "Phường Lê Chân", "Phường Kiến An"],
  "Cần Thơ": ["Phường Ninh Kiều", "Phường Cái Răng", "Phường Bình Thủy", "Phường Ô Môn"],
  "Huế": ["Phường Phú Xuân", "Phường Thuận Hóa", "Phường Hương Thủy"],
};

export const PHONE_RE = /^(0|\+84)\d{9}$/;

export function newOrderCode(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const rnd = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${yy}${mm}${rnd}`;
}
