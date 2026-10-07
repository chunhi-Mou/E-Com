"""Shared domain model (no dependency on any layer)."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np


class Modality(str, Enum):
    TEXT = "text"
    VOICE = "voice"
    IMAGE = "image"
    MULTIMODAL = "multimodal"


class Intent(str, Enum):
    PRODUCT_SEARCH = "PRODUCT_SEARCH"
    ORDER_LOOKUP = "ORDER_LOOKUP"
    ORDER_LATEST = "ORDER_LATEST"


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    SHIPPING = "SHIPPING"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


@dataclass(frozen=True)
class Category:
    slug: str
    parent: str | None
    name: str
    synonyms: tuple[str, ...] = ()
    path: str = ""  # materialized path, e.g. "/thoi-trang-nam/ao-nam"


@dataclass
class Product:
    id: str
    name: str
    category: str
    price: int
    description: str = ""
    source: str = "seed"
    source_id: str | None = None
    source_url: str | None = None
    brand: str | None = None
    original_price: int | None = None
    stock: int = 0
    rating: float = 0.0
    rating_count: int = 0
    sold_count: int = 0
    attributes: dict[str, list[str]] = field(default_factory=dict)
    tags: dict[str, list[str]] = field(default_factory=dict)
    images: list[str] = field(default_factory=list)

    def values_of(self, code: str) -> set[str]:
        """Values of one attribute code, merged from attributes and tags."""
        return set(self.attributes.get(code, [])) | set(self.tags.get(code, []))


@dataclass
class OrderItem:
    product_id: str
    quantity: int
    unit_price: int


@dataclass
class Order:
    order_code: str
    customer_id: str
    status: str
    created_at: str
    total: int
    items: list[OrderItem] = field(default_factory=list)


@dataclass(frozen=True)
class AttributeValueDef:
    code: str
    label: str
    synonyms: tuple[str, ...] = ()
    also_match: tuple[str, ...] = ()  # e.g. male also matches unisex in hard filters


@dataclass(frozen=True)
class AttributeDef:
    code: str
    is_hard_filterable: bool
    values: dict[str, AttributeValueDef]


@dataclass
class Vocabulary:
    """Controlled vocabulary: single source of attribute knowledge."""
    attributes: dict[str, AttributeDef]

    def label(self, attr: str, value: str) -> str:
        v = self.attributes[attr].values.get(value)
        return v.label if v else value

    def is_hard(self, attr: str) -> bool:
        a = self.attributes.get(attr)
        return bool(a and a.is_hard_filterable)


@dataclass
class QueryRepresentation:
    """Common Query Representation shared by all modalities."""
    modality: Modality
    raw_text: str = ""
    normalized_text: str = ""
    language: str = "vi"
    intent: Intent = Intent.PRODUCT_SEARCH
    hard_filters: dict[str, Any] = field(default_factory=dict)
    soft_preferences: dict[str, list[str]] = field(default_factory=dict)
    expansion_terms: list[str] = field(default_factory=list)
    residual_text: str = ""  # words not explained by any filter or preference
    text_embedding: np.ndarray | None = None
    image_embedding: np.ndarray | None = None
    weights: dict[str, float] = field(default_factory=lambda: {"text": 1.0, "image": 0.0})
    parser: str = "rules"
    matches: list[dict[str, str]] = field(default_factory=list)  # debug: which phrase matched what

    def to_dict(self) -> dict[str, Any]:
        return {
            "modality": self.modality.value,
            "raw_text": self.raw_text,
            "normalized_text": self.normalized_text,
            "language": self.language,
            "intent": self.intent.value,
            "hard_filters": self.hard_filters,
            "soft_preferences": self.soft_preferences,
            "expansion_terms": self.expansion_terms,
            "residual_text": self.residual_text,
            "text_embedding_dim": None if self.text_embedding is None else int(self.text_embedding.shape[0]),
            "image_embedding_dim": None if self.image_embedding is None else int(self.image_embedding.shape[0]),
            "weights": self.weights,
            "parser": self.parser,
            "matches": self.matches,
        }


@dataclass
class SearchCandidate:
    """Retrieval output (not the final order)."""
    product: Product
    keyword_score: float = 0.0  # raw BM25
    dense_score: float = 0.0    # cosine text embedding
    image_score: float = 0.0    # cosine image embedding
    rrf_score: float = 0.0
    sources: list[str] = field(default_factory=list)  # retrievers that returned it


@dataclass
class SearchResult:
    """Ranking output with a per-component score breakdown."""
    product: Product
    rank: int
    scores: dict[str, float]  # text, image, business, soft, final
    details: dict[str, Any] = field(default_factory=dict)  # raw keyword/dense, weights, matched soft prefs


@dataclass
class RetrievalResult:
    candidates: list[SearchCandidate]
    applied_filters: dict[str, Any]
    relaxed_filters: list[str]
    eligible_count: int
    dropped_filters: dict[str, Any] = field(default_factory=dict)  # values of relaxed filters, reused as soft boosts
    stats: dict[str, int] = field(default_factory=dict)
