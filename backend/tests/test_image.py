import pytest

from render import render
from seed_data import COLOR_RGB, build_products

SHAPES = {f"P{i:06d}": p["_shape"] for i, p in enumerate(build_products(), start=1)}


def same_look(container, shape, color):
    out = set()
    for pid, s in SHAPES.items():
        p = container.catalog.get_product(pid)
        if s == shape and p.attributes["color"][0] == color:
            out.add(pid)
    return out


@pytest.mark.parametrize("shape,color", [
    ("sweater", "navy"), ("running_shoe", "black"), ("crossbody", "red"), ("tshirt", "white"), ("laptop", "silver"),
])
def test_image_query_finds_same_color_and_shape(search, container, tmp_path, shape, color):
    path = tmp_path / "q.jpg"
    render(shape, [COLOR_RGB[color]], 200, seed=4242).save(path)  # not a catalog image
    resp = search(image=str(path), limit=3)
    expected = same_look(container, shape, color)
    assert expected
    assert resp.results[0].product.id in expected
    assert resp.representation.modality.value == "image"
    assert resp.results[0].scores["image"] > 0.8


def test_image_bytes_supported(search, tmp_path):
    path = tmp_path / "q.jpg"
    render("sweater", [COLOR_RGB["navy"]], 160, seed=1).save(path)
    resp = search(image=path.read_bytes())
    assert resp.results


def test_multimodal_uses_text_as_filter_and_lambda(search, container, tmp_path):
    path = tmp_path / "q.jpg"
    render("tshirt", [COLOR_RGB["white"]], 200, seed=7).save(path)
    resp = search(text="màu đen", image=str(path), limit=3)
    rep = resp.representation
    assert rep.modality.value == "multimodal"
    assert abs(sum(rep.weights.values()) - 1.0) < 1e-6 and rep.weights["image"] > rep.weights["text"]
    assert all("black" in r.product.attributes["color"] for r in resp.results)
    assert resp.results[0].product.category.startswith("ao-thun")
