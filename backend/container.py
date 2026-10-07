"""Composition root: the only place that wires adapters and layers together.

Adapters are chosen by environment variables so phase-2 remote adapters can be added
by registering a factory below; nothing else changes.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Mapping

from application.adapters.assistant import AssistantReplier
from application.adapters.http import load_dotenv
from application.adapters.jina import JinaClipImageEncoder, JinaReranker, JinaTextEncoder
from application.adapters.llm import OpenAICompatibleLLM
from application.adapters.llm_query_parser import LlmQueryParser, MergingExpander
from application.adapters.speech_to_text import ElevenLabsSpeechToText
from application.adapters.suggest import SuggestService
from application.adapters.synthesizer import (
    EdgeTtsSynthesizer,
    ElevenLabsSynthesizer,
    FallbackSpeechSynthesizer,
    SpeechSynthesizer,
)
from application.catalog_service import CatalogService
from application.image_service import ColorHistogramEncoder, ImageEncoder
from application.lexicon import Lexicon
from application.order_service import OrderService
from application.query_service import ConceptExpander, PassthroughParser, QueryParser, QueryService, RuleQueryParser
from application.ranking_service import RankingConfig, RankingService
from application.reranker import Reranker, TokenCoverageReranker
from application.search_orchestrator import SearchOrchestrator
from application.search_service import DocumentBuilder, RetrievalConfig, SearchService
from application.speech_service import SimulatedSpeechToText, SpeechToText
from application.text_encoder import HashingTextEncoder, TextEncoder
from data.keyword_index import Bm25KeywordIndex
from data.order_repository import JsonOrderRepository
from data.product_repository import DATASET_DIR, JsonProductRepository
from data.vector_index import NumpyVectorIndex
from data.vocabulary_repository import JsonVocabularyRepository
from domain.models import Vocabulary

# env var -> {adapter name -> factory}. Remote adapters read their keys from the environment on creation.
STT_ADAPTERS: dict[str, Callable[[], SpeechToText]] = {
    "simulated": SimulatedSpeechToText, "elevenlabs": ElevenLabsSpeechToText.from_env}
TEXT_ENCODERS: dict[str, Callable[[], TextEncoder]] = {"hashing": HashingTextEncoder, "jina": JinaTextEncoder.from_env}
IMAGE_ENCODERS: dict[str, Callable[[], ImageEncoder]] = {
    "color_histogram": ColorHistogramEncoder, "jina_clip": JinaClipImageEncoder.from_env}
RERANKERS: dict[str, Callable[[], Reranker | None]] = {
    "token_coverage": TokenCoverageReranker, "none": lambda: None, "jina": JinaReranker.from_env}
QUERY_PARSERS = ("rules", "llm")

# ablation profiles: what each stage adds
PROFILES = {
    "keyword": "BM25 on name+description, raw text, no parser",
    "enriched": "+ index-time enrichment (category path, attributes, tags, synonyms)",
    "parser": "+ rule parser: hard filters, price, soft preferences",
    "full": "+ concept expansion, dense retrieval, reranker, business score",
}


@dataclass
class Settings:
    dataset_dir: Path = DATASET_DIR
    profile: str = "full"
    stt: str = "simulated"
    text_encoder: str = "hashing"
    image_encoder: str = "color_histogram"
    reranker: str = "token_coverage"
    query_parser: str = "rules"
    llm_timeout_s: float = 2.5
    default_customer_id: str = "C001"
    data_backend: str = "json"  # json | postgres
    pg_dsn: str = "postgresql://ecom:ecom@localhost:5432/ecom"

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Settings":
        if env is None:
            load_dotenv([Path(__file__).resolve().parent / ".env", Path(__file__).resolve().parent.parent / ".env"])
            env = os.environ
        return cls(
            dataset_dir=Path(env.get("DATASET_DIR", str(DATASET_DIR))),
            profile=env.get("SEARCH_PROFILE", "full"),
            stt=env.get("STT_ADAPTER", "simulated"),
            text_encoder=env.get("TEXT_ENCODER", "hashing"),
            image_encoder=env.get("IMAGE_ENCODER", "color_histogram"),
            reranker=env.get("RERANKER", "token_coverage"),
            query_parser=env.get("QUERY_PARSER", "rules"),
            llm_timeout_s=float(env.get("LLM_TIMEOUT_S") or 2.5),
            default_customer_id=env.get("DEFAULT_CUSTOMER_ID", "C001"),
            data_backend=env.get("DATA_BACKEND") or "json",
            pg_dsn=env.get("PG_DSN") or cls.pg_dsn,
        )


def _data_layer(s: Settings):
    """Swap the whole Data layer (Repository pattern): JSON + numpy, or PostgreSQL + pgvector."""
    if s.data_backend == "json":
        return (JsonProductRepository(s.dataset_dir), JsonOrderRepository(s.dataset_dir),
                JsonVocabularyRepository(s.dataset_dir), NumpyVectorIndex(), NumpyVectorIndex())
    if s.data_backend == "postgres":
        from data.postgres import build_postgres_data_layer  # optional dependency (psycopg, pgvector)
        layer = build_postgres_data_layer(s.pg_dsn, s.dataset_dir, text_model=s.text_encoder,
                                          image_model=s.image_encoder)
        return tuple(layer)
    raise ValueError(f"unknown data backend '{s.data_backend}'; available: ['json', 'postgres']")


def _pick(registry: dict, name: str, what: str):
    if name not in registry:
        raise ValueError(f"unknown {what} '{name}'; available: {sorted(registry)}")
    return registry[name]()


@dataclass
class Container:
    settings: Settings
    vocabulary: Vocabulary
    catalog: CatalogService
    orders: OrderService
    orchestrator: SearchOrchestrator
    search: SearchService
    ranking: RankingService
    queries: QueryService
    lexicon: Lexicon
    dataset_dir: Path = field(default=DATASET_DIR)
    assistant: AssistantReplier = field(default_factory=AssistantReplier)
    suggestions: SuggestService | None = None
    synthesizer: SpeechSynthesizer | None = None
    tts_dir: Path | None = None  # public directory of synthesized audio (served at /static/tts)


def build_container(settings: Settings | None = None) -> Container:
    s = settings or Settings.from_env()
    if s.profile not in PROFILES:
        raise ValueError(f"unknown profile '{s.profile}'; available: {sorted(PROFILES)}")
    if s.query_parser not in QUERY_PARSERS:
        raise ValueError(f"unknown query parser '{s.query_parser}'; available: {list(QUERY_PARSERS)}")
    full = s.profile == "full"
    use_parser = s.profile in ("parser", "full")

    products, order_repo, vocabulary_repo, text_index, image_index = _data_layer(s)
    vocabulary = vocabulary_repo.load()
    lexicon = Lexicon(vocabulary, products.categories(), products.brands())

    text_encoder = _pick(TEXT_ENCODERS, s.text_encoder, "text encoder")
    image_encoder = _pick(IMAGE_ENCODERS, s.image_encoder, "image encoder")
    reranker = _pick(RERANKERS, s.reranker, "reranker") if full else None
    parser: QueryParser = RuleQueryParser(lexicon) if use_parser else PassthroughParser()
    expander = ConceptExpander(products, lexicon) if full else None
    if use_parser and s.query_parser == "llm":
        # no retry: the parser has a hard time budget and falls back to rules itself
        llm_parser = OpenAICompatibleLLM.from_env(timeout=s.llm_timeout_s, retries=0)
        parser = LlmQueryParser(lexicon, llm_parser, s.llm_timeout_s)
        expander = MergingExpander(products, lexicon) if full else None

    docs = DocumentBuilder(products, vocabulary, enriched=s.profile != "keyword")
    search = SearchService(products, vocabulary, Bm25KeywordIndex(), text_index, image_index,
                           text_encoder, image_encoder, docs, RetrievalConfig(use_dense=full))
    search.build_index()
    ranking = RankingService(docs, reranker, RankingConfig(business=0.10 if full else 0.0,
                                                           soft=0.20 if use_parser else 0.0))
    queries = QueryService(parser, expander, text_encoder, image_encoder)
    orders = OrderService(order_repo, products)
    orchestrator = SearchOrchestrator(_pick(STT_ADAPTERS, s.stt, "STT"),
                                      queries, search, ranking, orders, s.default_customer_id)
    llm = OpenAICompatibleLLM.from_env() if OpenAICompatibleLLM.configured(os.environ) else None
    tts_dir = s.dataset_dir / "cache" / "tts"
    edge = EdgeTtsSynthesizer(tts_dir)
    synth: SpeechSynthesizer = edge
    if os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_VOICE_ID"):
        eleven = ElevenLabsSynthesizer.from_env(tts_dir)
        synth = FallbackSpeechSynthesizer(primary=eleven, fallback=edge)
    suggestions = SuggestService(products.categories(), vocabulary, [p.name for p in products.all()])
    return Container(s, vocabulary, CatalogService(products), orders, orchestrator, search, ranking, queries,
                     lexicon, s.dataset_dir, AssistantReplier(llm, synth), suggestions, synth, tts_dir)
