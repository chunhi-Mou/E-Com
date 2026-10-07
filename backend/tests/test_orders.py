def test_order_lookup(search):
    resp = search(text="đơn hàng 20261001 đâu rồi")
    assert resp.order.order.order_code == "20261001"
    assert resp.order.order.status == "SHIPPING"
    assert resp.order.products


def test_latest_order_default_customer(search):
    resp = search(text="where is my latest order?")
    assert resp.order.order.order_code == "20261005"


def test_latest_order_other_customer(search):
    resp = search(text="đơn hàng mới nhất của tôi", customer_id="C002")
    assert resp.order.order.order_code == "20261002"


def test_unknown_order(search):
    assert search(text="đơn 99999999").order is None


def test_dataset_has_required_order(container):
    assert container.orders.lookup("20261001") is not None
