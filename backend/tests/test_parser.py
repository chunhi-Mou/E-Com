import pytest

from domain.models import Intent


def test_filler_and_price_vi(parser):
    rep = parser.parse("tôi muốn mua áo mùa đông dưới 500 nghìn")
    assert rep.normalized_text == "áo mùa đông"
    assert rep.hard_filters["price_max"] == 500_000
    assert rep.language == "vi"
    assert rep.intent == Intent.PRODUCT_SEARCH


@pytest.mark.parametrize("text,lo,hi", [
    ("giày dưới 500k", None, 500_000),
    ("laptop dưới 20 triệu", None, 20_000_000),
    ("áo từ 200k đến 500k", 200_000, 500_000),
    ("áo từ 200 đến 500k", 200_000, 500_000),
    ("áo 200k - 500k", 200_000, 500_000),
    ("phone under 100 dollars", None, 2_500_000),
    ("phone under $100", None, 2_500_000),
    ("shoes between 1 million and 2 million", 1_000_000, 2_000_000),
    ("áo trên 1 triệu", 1_000_000, None),
    ("áo dưới 1.5 triệu", None, 1_500_000),
    ("áo dưới 500.000đ", None, 500_000),
])
def test_price(parser, text, lo, hi):
    f = parser.parse(text).hard_filters
    assert f.get("price_min") == lo
    assert f.get("price_max") == hi


def test_order_code_and_latest(parser):
    rep = parser.parse("đơn hàng 20261001 đâu rồi")
    assert rep.intent == Intent.ORDER_LOOKUP and rep.hard_filters["order_code"] == "20261001"
    assert parser.parse("where is my latest order?").intent == Intent.ORDER_LATEST
    assert parser.parse("đơn hàng mới nhất của tôi").intent == Intent.ORDER_LATEST


def test_large_price_is_not_order_code(parser):
    rep = parser.parse("laptop dưới 10000000")
    assert rep.intent == Intent.PRODUCT_SEARCH and rep.hard_filters["price_max"] == 10_000_000


def test_synonyms_hard_vs_soft(parser):
    rep = parser.parse("áo len đen mùa đông")
    assert rep.hard_filters["color"] == ["black"]
    assert rep.soft_preferences["season"] == ["winter"]
    assert "season" not in rep.hard_filters


def test_unaccented_and_accented_agree(parser):
    a, b = parser.parse("áo len cổ lọ"), parser.parse("ao len co lo")
    assert a.hard_filters == b.hard_filters
    assert a.hard_filters["category"] == ["ao-co-lo-nam", "ao-co-lo-nu"]


def test_accent_must_not_match_other_word(parser):
    # "đến" (to) must not be read as "đen" (black)
    assert "color" not in parser.parse("áo từ 200k đến 500k").hard_filters


def test_english_query(parser):
    rep = parser.parse("find me black running shoes under 2 million dong")
    assert rep.language == "en"
    assert rep.hard_filters["color"] == ["black"]
    assert rep.hard_filters["price_max"] == 2_000_000
    assert rep.hard_filters["category"] == ["giay-chay-bo-nam", "giay-chay-bo-nu"]
    assert rep.normalized_text == "black running shoes"


def test_brand_from_data(parser):
    assert parser.parse("giày Nike").hard_filters["brand"] == ["Nike"]


def test_category_is_minimal_set(parser):
    assert parser.parse("áo").hard_filters["category"] == ["ao-nam", "ao-nu"]


def test_ambiguous_synonym_maps_to_all_values(parser):
    assert set(parser.parse("áo xanh").hard_filters["color"]) == {"green", "blue"}


def test_implicit_concept_is_soft(parser):
    rep = parser.parse("đồ đi biển")
    assert rep.soft_preferences == {"occasion": ["beach"]}
    assert not rep.hard_filters
