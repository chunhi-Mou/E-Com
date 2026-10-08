"""Language-level rules for the rule-based parser: price, order intent, filler phrases, language."""
from __future__ import annotations

import re

from domain.text_utils import has_diacritics, strip_accents, tokenize

USD_TO_VND = 25_000

_NUM = r"\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?"
_UNIT = r"dollars?|usd|trieu|million|thousand|nghin|ngan|vnd|dong|do la|tr|k|m|d|\$"


def _money(s: str) -> str:
    return rf"(?:(?P<c{s}>\$)\s*)?(?P<n{s}>{_NUM})\s*(?P<u{s}>{_UNIT})?(?:\s*(?:dong|vnd|d))?(?![a-z])"


_SEP = r"(?:den|toi|to|and|-|–)"
_RANGE = re.compile(rf"(?:(?:tu|from|between)\s+)?{_money('1')}\s*{_SEP}\s*{_money('2')}")
_UPPER = re.compile(rf"(?:duoi|nho hon|it hon|toi da|khong qua|under|below|less than|up to|max(?:imum)?|cheaper than|<=?)\s*{_money('1')}")
_LOWER = re.compile(rf"(?:tren|lon hon|nhieu hon|toi thieu|tu|from|over|above|more than|at least|min(?:imum)?|>=?)\s*{_money('1')}")

_UNIT_MULT = {"k": 1e3, "nghin": 1e3, "ngan": 1e3, "thousand": 1e3,
              "tr": 1e6, "trieu": 1e6, "m": 1e6, "million": 1e6,
              "usd": USD_TO_VND, "dollar": USD_TO_VND, "dollars": USD_TO_VND, "$": USD_TO_VND, "do la": USD_TO_VND,
              "dong": 1, "vnd": 1, "d": 1}
_THOUSAND_SEP = re.compile(r"^\d{1,3}(?:[.,]\d{3})+$")


def _to_vnd(num: str, unit: str | None, cur: str | None, lang: str) -> int:
    if _THOUSAND_SEP.match(num):
        value = float(re.sub(r"[.,]", "", num))
        bare_small = False
    else:
        value = float(num.replace(",", "."))
        bare_small = value < 1000
    unit = unit or ("$" if cur else None)
    if unit is None:
        if not bare_small:
            return int(value)
        unit = "$" if lang == "en" else "k"  # "under 100" -> dollars; "duoi 500" -> 500k
    return int(round(value * _UNIT_MULT[unit]))


def extract_price(u: str, lang: str) -> tuple[int | None, int | None, str]:
    """Return (price_min, price_max, text with price spans blanked). `u` is lowercase and unaccented."""
    lo = hi = None
    m = _RANGE.search(u)
    if m:
        u1, u2 = m["u1"] or ("$" if m["c1"] else None), m["u2"] or ("$" if m["c2"] else None)
        a = _to_vnd(m["n1"], u1 or u2, m["c1"], lang)
        b = _to_vnd(m["n2"], u2 or u1, m["c2"], lang)
        lo, hi = min(a, b), max(a, b)
        return lo, hi, u[:m.start()] + " " * (m.end() - m.start()) + u[m.end():]
    for pat, is_upper in ((_UPPER, True), (_LOWER, False)):
        m = pat.search(u)
        if m:
            v = _to_vnd(m["n1"], m["u1"], m["c1"], lang)
            lo, hi = (None, v) if is_upper else (v, None)
            return lo, hi, u[:m.start()] + " " * (m.end() - m.start()) + u[m.end():]
    return None, None, u


_ORDER_CODE = re.compile(r"(?<![\d.,])\d{8}(?![\d.,])")
_ORDER_WORD = re.compile(r"\b(?:don hang|don moi|don gan|don cua|orders?|package|parcel)\b")


def detect_order(u: str) -> tuple[str | None, bool]:
    """Return (order_code or None, mentions_order). `u` is price-free."""
    m = _ORDER_CODE.search(u)
    return (m.group(0) if m else None), bool(_ORDER_WORD.search(u))


_FILLERS = sorted([
    "toi muon mua", "toi muon tim", "toi muon xem", "toi muon", "toi can mua", "toi can tim", "toi can",
    "toi dang tim kiem", "toi dang tim", "minh muon mua", "minh muon", "minh can", "muon mua", "can mua",
    "cho toi xem", "cho toi", "cho minh", "tim giup toi", "tim giup minh", "tim cho toi", "tim kiem", "tim giup",
    "hay tim", "mua giup", "xin chao", "giup minh", "giup toi", "nhe", "nha", "nhi", "gium",
    "i want to buy", "i want to find", "i want to see", "i want", "i need", "i would like to", "i would like",
    "i'd like", "i am looking for", "i'm looking for", "looking for", "find me", "show me", "give me",
    "search for", "can you find", "can you show", "could you find", "could you show", "please",
], key=len, reverse=True)
# "tớ muốn", "mình đang cần tìm", "em muốn mua": any first-person pronoun + want verbs (+ buy/find verb). Matched on
# unaccented text, so a bare "tớ"/"to" is dropped only when a want verb follows ("áo size to" stays intact).
_PRONOUN = r"(?:toi|to|minh|tui|tao|em|anh|chi|ban|ad|shop)"
_WANT = r"(?:dang|muon|can|dinh|thich|hay|se)"
_DO = r"(?:mua|tim kiem|tim|xem|kiem|lay|dat)"
_FILLER_RE = re.compile(
    rf"\b(?:{_PRONOUN}\s+{_WANT}(?:\s+{_WANT})*(?:\s+{_DO})?|" + "|".join(re.escape(f) for f in _FILLERS) + r")\b")

STOPWORDS = {"cho", "va", "voi", "the", "a", "an", "of", "for", "and", "with", "in", "to", "is", "my", "me", "do",
             "nhung", "cac", "mot", "la", "co"}
_VI_WORDS = {"toi", "muon", "mua", "tim", "cho", "duoi", "tren", "tu", "den", "nghin", "trieu", "don", "hang",
             "moi", "nhat", "dau", "voi", "mau", "giup", "minh", "can", "xem", "cua", "va", "khong", "nhe"}
_EN_WORDS = {"the", "a", "an", "for", "with", "under", "over", "below", "above", "find", "show", "me", "i", "want",
             "to", "buy", "looking", "my", "order", "latest", "please", "and", "of", "in", "between", "than",
             "less", "more", "dollars", "dollar", "million", "where", "is", "need", "give", "search"}


def strip_fillers(text: str, u: str) -> tuple[str, str]:
    """Remove filler phrases from both the accented text and its aligned unaccented copy."""
    out_t, out_u, pos = [], [], 0
    for m in _FILLER_RE.finditer(u):
        out_t.append(text[pos:m.start()])
        out_u.append(u[pos:m.start()])
        pos = m.end()
    out_t.append(text[pos:])
    out_u.append(u[pos:])
    return " ".join("".join(out_t).split()), " ".join("".join(out_u).split())


def detect_language(text: str) -> str:
    if has_diacritics(text):
        return "vi"
    toks = [strip_accents(t) for t in tokenize(text)]
    vi = sum(t in _VI_WORDS for t in toks)
    en = sum(t in _EN_WORDS for t in toks)
    return "en" if en > vi else "vi"
