// Types mirror the backend API responses exactly.
export type CategoryRef = { slug: string; name: string };

export type Product = {
  id: string;
  name: string;
  description: string;
  brand: string | null;
  category: string;
  category_path: CategoryRef[];
  price: number;
  original_price: number | null;
  stock: number;
  rating: number;
  rating_count: number;
  sold_count: number;
  attributes: Record<string, string[]>;
  tags: Record<string, string[]>;
  images: string[];
};

export type Modality = "text" | "voice" | "image" | "multimodal";
export type Intent = "PRODUCT_SEARCH" | "ORDER_LOOKUP" | "ORDER_LATEST";

export type QueryRepresentation = {
  modality: Modality;
  raw_text: string | null;
  normalized_text: string | null;
  language: "vi" | "en" | null;
  intent: Intent;
  hard_filters: {
    category?: string[];
    price_min?: number;
    price_max?: number;
    brand?: string[];
    [attr: string]: unknown;
  };
  soft_preferences: Record<string, string[]>;
  expansion_terms: string[];
  parser: "rules" | "llm";
};

export type Scores = { text: number; image: number; business: number; soft: number; final: number };
export type SearchResult = { product: Product; rank: number; scores: Scores };

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPING" | "DELIVERED" | "CANCELLED";

export type Order = {
  order_code: string;
  customer_id: string;
  status: OrderStatus;
  created_at: string;
  total: number;
  items: { product: Product; quantity: number; unit_price: number }[];
  status_history?: { status: string; at: string }[];
};

export type SearchResponse = {
  representation: QueryRepresentation;
  results: SearchResult[];
  total: number;
  relaxed_filters: string[];
  order: Order | null;
  latency_ms: number;
};

export type SortKey = "relevance" | "price_asc" | "price_desc" | "best_selling";

export type SearchFilters = {
  category?: string | string[];
  price_min?: number;
  price_max?: number;
  sort?: SortKey;
  /** Client-side extension (not in the contract): parser-inferred constraints the shopper removed. */
  ignore?: string[];
};

export type SearchRequest = {
  text: string;
  modality: "text" | "voice";
  limit?: number;
  filters?: SearchFilters;
};

export type Category = { slug: string; parent: string | null; name: string };

export type ProductsPage = { items: Product[]; total: number };

export type TranscribeResponse = { text: string; language: "vi" | "en" };
export type AssistantReplyRequest = {
  representation: QueryRepresentation;
  total: number;
  top_names: string[];
};
export type AssistantReply = { text: string; audio_url: string };

// ---- Client-side only (cart, checkout) ----
export type CartLine = {
  key: string; // productId + variant
  productId: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number | null;
  quantity: number;
  variant?: string;
  category?: string;
};

export type ShippingAddress = {
  fullName: string;
  phone: string;
  province: string;
  ward: string;
  street: string;
  note?: string;
};

export type PlacedOrder = Order & {
  address: ShippingAddress;
  payment: "COD" | "CARD";
  shipping_fee: number;
  placed_locally: true;
};
