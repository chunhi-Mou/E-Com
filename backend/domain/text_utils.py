"""Shared text normalization (accent stripping, tokenizing, light singularization)."""
from __future__ import annotations

import re
import unicodedata

_APOS_S = re.compile(r"['’]s\b")
_NON_WORD = re.compile(r"[^\w$#]+", re.UNICODE)


def strip_accents_char(ch: str) -> str:
    if ch in ("đ", "Đ"):
        return "d" if ch == "đ" else "D"
    base = "".join(c for c in unicodedata.normalize("NFD", ch) if not unicodedata.combining(c))
    return base if len(base) == 1 else ch


def strip_accents(text: str) -> str:
    """Strip Vietnamese accents char by char, so offsets stay aligned."""
    return "".join(strip_accents_char(c) for c in unicodedata.normalize("NFC", text))


def has_diacritics(token: str) -> bool:
    return strip_accents(token) != token


def singularize(token: str) -> str:
    """Very light English singularization (shoes -> shoe); applied to docs and queries alike."""
    if len(token) < 4 or not token.isascii():
        return token
    if token.endswith("ies"):
        return token[:-3] + "y"
    if token.endswith(("ss", "us", "is")):
        return token
    if token.endswith("s"):
        return token[:-1]
    return token


def tokenize(text: str) -> list[str]:
    """Lowercased accented tokens (English 's removed)."""
    text = _APOS_S.sub("", unicodedata.normalize("NFC", text.lower()))
    return [t for t in _NON_WORD.split(text) if t]


def tokenize_unaccented(text: str, singular: bool = True) -> list[str]:
    toks = [strip_accents(t) for t in tokenize(text)]
    return [singularize(t) for t in toks] if singular else toks
