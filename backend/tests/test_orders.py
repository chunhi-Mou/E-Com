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


def test_list_for_customer_newest_first(container):
    details = container.orders.list_for_customer("C001")
    assert [d.order.order_code for d in details] == ["20261005", "20261001", "20260928", "20260915"]
    assert all(d.products for d in details)


def test_list_for_customer_status_filter(container):
    details = container.orders.list_for_customer("C001", status="DELIVERED")
    assert [d.order.order_code for d in details] == ["20260928", "20260915"]


def test_list_for_unknown_customer_is_empty(container):
    assert container.orders.list_for_customer("nobody") == []
