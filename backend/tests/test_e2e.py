from datetime import datetime

from fastapi.testclient import TestClient
import pytest

from app.db import load_seed
from app.domain import OPEN


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("LOGICRAFT_DB", str(tmp_path / "logicraft.db"))
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def stock(client, warehouse_id, sku_id):
    rows = client.get("/api/inventory").json()
    return next(row for row in rows if row["warehouseId"] == warehouse_id and row["skuId"] == sku_id)


def test_seed_reservations_match_open_shipments():
    state = load_seed()
    expected = {}
    for shipment in state["shipments"]:
        if shipment["status"] not in OPEN:
            continue
        for line in shipment["lines"]:
            key = (shipment["originId"], line["skuId"])
            expected[key] = expected.get(key, 0) + line["qty"]
    for row in state["stock"]:
        key = (row["warehouseId"], row["skuId"])
        assert row["reserved"] == expected.get(key, 0)


def test_seed_links_resolve():
    state = load_seed()
    vehicles = {item["id"]: item for item in state["vehicles"]}
    drivers = {item["id"] for item in state["drivers"]}
    for vehicle in state["vehicles"]:
        if vehicle["driverId"] is not None:
            assert vehicle["driverId"] in drivers
    for shipment in state["shipments"]:
        if shipment["status"] in OPEN and shipment["vehicleId"]:
            vehicle = vehicles[shipment["vehicleId"]]
            assert shipment["driverId"] == vehicle["driverId"]
            assert vehicle["kind"] != "coach"
    trips = {item["id"] for item in state["trips"]}
    for ticket in state["tickets"]:
        assert ticket["tripId"] in trips
        assert ticket["seats"]


def test_health_and_dashboard(client):
    assert client.get("/api/health").json()["ok"] is True
    dash = client.get("/api/dashboard").json()
    assert dash["openShipments"] == 6
    assert dash["delayedShipments"] == 1
    names = {row["sku"] for row in dash["lowStock"]}
    assert "Beverages" in names
    assert "Cold-chain pharma" in names


def test_shipment_reserves_then_rejects_oversell_then_cancels(client):
    before = stock(client, "WH-MUM", "SKU-PKG")
    created = client.post(
        "/api/shipments",
        json={
            "customer": "PackRight",
            "originId": "WH-MUM",
            "destinationCity": "Ahmedabad",
            "destinationAddress": "Narol goods yard, Ahmedabad",
            "destLat": 23.0225,
            "destLng": 72.5714,
            "priority": "express",
            "lines": [{"skuId": "SKU-PKG", "qty": 15}],
        },
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["status"] == "reserved"
    assert body["reference"].startswith("LC-")
    assert body["distanceKm"] > 0
    after = stock(client, "WH-MUM", "SKU-PKG")
    assert after["reserved"] == before["reserved"] + 15
    assert after["available"] == before["available"] - 15

    oversell = client.post(
        "/api/shipments",
        json={
            "customer": "PackRight",
            "originId": "WH-MUM",
            "destinationCity": "Ahmedabad",
            "destinationAddress": "Narol goods yard, Ahmedabad",
            "destLat": 23.0225,
            "destLng": 72.5714,
            "lines": [{"skuId": "SKU-PKG", "qty": 10000}],
        },
    )
    assert oversell.status_code == 400
    assert "Not enough" in oversell.json()["detail"]
    assert stock(client, "WH-MUM", "SKU-PKG")["reserved"] == after["reserved"]

    cancelled = client.post("/api/shipments/" + body["id"] + "/cancel")
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert stock(client, "WH-MUM", "SKU-PKG")["reserved"] == before["reserved"]


def test_full_shipment_lifecycle_consumes_stock(client):
    blocked = client.post("/api/shipments/SH-18421/advance")
    assert blocked.status_code == 400
    assert blocked.json()["detail"] == "Assign a vehicle before pickup"

    coach = client.post("/api/shipments/SH-18421/assign", json={"vehicleId": "VH-07"})
    assert coach.status_code == 400
    assert "Coaches" in coach.json()["detail"]

    busy = client.post("/api/shipments/SH-18421/assign", json={"vehicleId": "VH-01"})
    assert busy.status_code == 400

    assigned = client.post("/api/shipments/SH-18421/assign", json={"vehicleId": "VH-06"})
    assert assigned.status_code == 200, assigned.text
    assert assigned.json()["status"] == "assigned"
    assert assigned.json()["driverId"] == "DR-02"

    for expected in ("picked-up", "in-transit", "delivered"):
        moved = client.post("/api/shipments/SH-18421/advance")
        assert moved.status_code == 200, moved.text
        assert moved.json()["status"] == expected

    row = stock(client, "WH-BLR", "SKU-ELC")
    assert row["reserved"] == 0
    assert row["onHand"] == 36
    vehicle = next(item for item in client.get("/api/vehicles").json() if item["id"] == "VH-06")
    assert vehicle["status"] == "idle"
    assert vehicle["city"] == "Hyderabad"


def test_stock_adjust_and_transfer(client):
    bad = client.post(
        "/api/inventory/adjust",
        json={"warehouseId": "WH-MUM", "skuId": "SKU-PKG", "delta": -500, "reason": "cycle count"},
    )
    assert bad.status_code == 400
    moved = client.post(
        "/api/inventory/transfer",
        json={
            "fromWarehouseId": "WH-MUM",
            "toWarehouseId": "WH-DEL",
            "skuId": "SKU-PKG",
            "qty": 10,
        },
    )
    assert moved.status_code == 200, moved.text
    assert stock(client, "WH-MUM", "SKU-PKG")["onHand"] == 190
    assert stock(client, "WH-DEL", "SKU-PKG")["onHand"] == 150
    added = client.post(
        "/api/inventory/adjust",
        json={"warehouseId": "WH-DEL", "skuId": "SKU-PKG", "delta": 5, "reason": "found a bundle"},
    )
    assert added.status_code == 200
    assert stock(client, "WH-DEL", "SKU-PKG")["onHand"] == 155


def test_driver_and_workshop(client):
    leave = client.post("/api/vehicles/VH-06/driver", json={"driverId": "DR-06"})
    assert leave.status_code == 400
    assigned = client.post("/api/vehicles/VH-06/driver", json={"driverId": "DR-10"})
    assert assigned.status_code == 200, assigned.text
    assert assigned.json()["driverId"] == "DR-10"
    drivers = {item["id"]: item for item in client.get("/api/state").json()["drivers"]}
    assert drivers["DR-10"]["status"] == "on-duty"
    assert drivers["DR-02"]["status"] == "off-duty"

    future = client.post(
        "/api/maintenance",
        json={
            "vehicleId": "VH-02",
            "type": "Oil service",
            "dueDate": "2099-01-01",
            "notes": "Plan it after the Surat run",
        },
    )
    assert future.status_code == 200
    vehicle = next(item for item in client.get("/api/vehicles").json() if item["id"] == "VH-02")
    assert vehicle["status"] == "loading"

    today = datetime.now().astimezone().date().isoformat()
    parked = client.post(
        "/api/maintenance",
        json={"vehicleId": "VH-06", "type": "Brake inspection", "dueDate": today, "notes": "Noise"},
    )
    assert parked.status_code == 200, parked.text
    vehicle = next(item for item in client.get("/api/vehicles").json() if item["id"] == "VH-06")
    assert vehicle["status"] == "maintenance"
    assert vehicle["driverId"] is None
    done = client.post("/api/maintenance/" + parked.json()["id"] + "/complete")
    assert done.status_code == 200
    vehicle = next(item for item in client.get("/api/vehicles").json() if item["id"] == "VH-06")
    assert vehicle["status"] == "idle"


def test_ticket_booking_and_cancel(client):
    taken = client.post(
        "/api/tickets",
        json={
            "tripId": "TR-12A",
            "passenger": "Riya Jaiswal",
            "phone": "9820012345",
            "fromStop": "Bandra",
            "toStop": "Andheri",
            "seats": [2],
        },
    )
    assert taken.status_code == 400
    assert "already taken" in taken.json()["detail"]

    booked = client.post(
        "/api/tickets",
        json={
            "tripId": "TR-07B",
            "passenger": "Riya Jaiswal",
            "phone": "+91 98200 12345",
            "fromStop": "Whitefield",
            "toStop": "Majestic",
            "seats": [4, 8],
        },
    )
    assert booked.status_code == 200, booked.text
    ticket = booked.json()
    assert ticket["status"] == "confirmed"
    assert ticket["fareInr"] == 90
    again = client.post(
        "/api/tickets",
        json={
            "tripId": "TR-07B",
            "passenger": "Aman Shah",
            "phone": "9811111111",
            "fromStop": "Whitefield",
            "toStop": "Majestic",
            "seats": [4],
        },
    )
    assert again.status_code == 400
    cancelled = client.post("/api/tickets/" + ticket["code"] + "/cancel")
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    freed = client.post(
        "/api/tickets",
        json={
            "tripId": "TR-07B",
            "passenger": "Aman Shah",
            "phone": "9811111111",
            "fromStop": "Whitefield",
            "toStop": "Majestic",
            "seats": [4],
        },
    )
    assert freed.status_code == 200
