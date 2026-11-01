"""Pure operations for fleet, warehouse, shipment, and transit.

Every mutation takes a state dict and returns a new one. Callers persist it.
"""

from __future__ import annotations

import math
import random
from copy import deepcopy
from datetime import datetime, timedelta

OPEN = {"reserved", "assigned", "picked-up", "in-transit"}
NEXT_STATUS = {
    "assigned": "picked-up",
    "picked-up": "in-transit",
    "in-transit": "delivered",
}
ADVANCE_LABEL = {
    "picked-up": "Picked up",
    "in-transit": "In transit",
    "delivered": "Delivered",
}


def now_iso():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def today_iso():
    return datetime.now().astimezone().date().isoformat()


def clone(state):
    return deepcopy(state)


def uid(prefix):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return prefix + "-" + "".join(random.choice(alphabet) for _ in range(6))


def by_id(items, item_id):
    for item in items:
        if item["id"] == item_id:
            return item
    return None


def find_stock(state, warehouse_id, sku_id):
    for row in state["stock"]:
        if row["warehouseId"] == warehouse_id and row["skuId"] == sku_id:
            return row
    return None


def available(row):
    return row["onHand"] - row["reserved"]


def haversine_km(lat1, lng1, lat2, lng2):
    radius = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


def booked_seats(state, trip_id):
    taken = set()
    for ticket in state["tickets"]:
        if ticket["tripId"] == trip_id and ticket["status"] == "confirmed":
            taken.update(ticket["seats"])
    return taken


def _event(label, detail):
    return {"at": now_iso(), "label": label, "detail": detail}


def _movement(state, warehouse_id, sku_id, delta, reason):
    state["movements"].insert(
        0,
        {
            "id": uid("MV"),
            "at": now_iso(),
            "warehouseId": warehouse_id,
            "skuId": sku_id,
            "delta": delta,
            "reason": reason,
        },
    )


def _fail(state, message):
    return state, message


def assign_driver(state, vehicle_id, driver_id):
    state = clone(state)
    vehicle = by_id(state["vehicles"], vehicle_id)
    if vehicle is None:
        return _fail(state, "Vehicle not found")
    if vehicle["status"] == "maintenance":
        return _fail(state, "Vehicle is in the workshop")
    if driver_id is None:
        previous = by_id(state["drivers"], vehicle["driverId"]) if vehicle["driverId"] else None
        vehicle["driverId"] = None
        if previous is not None:
            previous["status"] = "off-duty"
        vehicle["updatedAt"] = now_iso()
        return state, None
    driver = by_id(state["drivers"], driver_id)
    if driver is None:
        return _fail(state, "Driver not found")
    if driver["status"] == "leave":
        return _fail(state, "That driver is on leave")
    for other in state["vehicles"]:
        if other["driverId"] == driver_id:
            other["driverId"] = None
    if vehicle["driverId"] and vehicle["driverId"] != driver_id:
        previous = by_id(state["drivers"], vehicle["driverId"])
        if previous is not None and previous["status"] != "leave":
            previous["status"] = "off-duty"
    vehicle["driverId"] = driver_id
    driver["status"] = "on-duty"
    vehicle["updatedAt"] = now_iso()
    return state, None


def _park_for_workshop(state, vehicle):
    if vehicle["driverId"]:
        driver = by_id(state["drivers"], vehicle["driverId"])
        if driver is not None and driver["status"] != "leave":
            driver["status"] = "off-duty"
        vehicle["driverId"] = None
    vehicle["status"] = "maintenance"
    vehicle["heading"] = "Workshop"
    vehicle["updatedAt"] = now_iso()


def schedule_maintenance(state, vehicle_id, kind, due_date, notes, today=None):
    state = clone(state)
    today = today or today_iso()
    vehicle = by_id(state["vehicles"], vehicle_id)
    if vehicle is None:
        return _fail(state, "Vehicle not found")
    if not kind or not str(kind).strip():
        return _fail(state, "Choose a service type")
    if len(str(due_date)) != 10:
        return _fail(state, "Choose a due date")
    state["maintenance"].insert(
        0,
        {
            "id": uid("MN"),
            "vehicleId": vehicle_id,
            "type": kind.strip(),
            "dueDate": due_date,
            "status": "scheduled",
            "notes": (notes or "").strip(),
            "workshop": vehicle["city"] + " yard",
        },
    )
    if due_date <= today:
        _park_for_workshop(state, vehicle)
    return state, None


def send_to_workshop(state, vehicle_id, today=None):
    state = clone(state)
    today = today or today_iso()
    vehicle = by_id(state["vehicles"], vehicle_id)
    if vehicle is None:
        return _fail(state, "Vehicle not found")
    if vehicle["status"] == "maintenance":
        return _fail(state, "Already in the workshop")
    open_jobs = [
        job
        for job in state["maintenance"]
        if job["vehicleId"] == vehicle_id and job["status"] != "done"
    ]
    if not open_jobs:
        state["maintenance"].insert(
            0,
            {
                "id": uid("MN"),
                "vehicleId": vehicle_id,
                "type": "General service",
                "dueDate": today,
                "status": "scheduled",
                "notes": "Called in from the yard.",
                "workshop": vehicle["city"] + " yard",
            },
        )
    _park_for_workshop(state, vehicle)
    return state, None


def complete_maintenance(state, job_id):
    state = clone(state)
    job = by_id(state["maintenance"], job_id)
    if job is None:
        return _fail(state, "Maintenance record not found")
    if job["status"] == "done":
        return _fail(state, "This job is already done")
    job["status"] = "done"
    vehicle = by_id(state["vehicles"], job["vehicleId"])
    still_open = [
        item
        for item in state["maintenance"]
        if item["vehicleId"] == job["vehicleId"] and item["status"] != "done"
    ]
    if vehicle is not None and not still_open:
        vehicle["status"] = "idle"
        vehicle["heading"] = "Yard"
        vehicle["updatedAt"] = now_iso()
    return state, None


def adjust_stock(state, warehouse_id, sku_id, delta, reason):
    state = clone(state)
    if by_id(state["warehouses"], warehouse_id) is None:
        return _fail(state, "Warehouse not found")
    sku = by_id(state["skus"], sku_id)
    if sku is None:
        return _fail(state, "Unknown item")
    if not isinstance(delta, int) or delta == 0:
        return _fail(state, "Enter a quantity other than zero")
    if not reason or len(reason.strip()) < 3:
        return _fail(state, "Tell us why this count changed")
    row = find_stock(state, warehouse_id, sku_id)
    if row is None:
        if delta < 0:
            return _fail(state, "Not enough stock to move")
        row = {
            "warehouseId": warehouse_id,
            "skuId": sku_id,
            "onHand": 0,
            "reserved": 0,
            "reorderAt": 10,
        }
        state["stock"].append(row)
    if row["onHand"] + delta < row["reserved"]:
        return _fail(state, "That would drop stock below what is already reserved")
    row["onHand"] += delta
    _movement(state, warehouse_id, sku_id, delta, reason.strip())
    return state, None


def transfer_stock(state, source_id, dest_id, sku_id, qty):
    state = clone(state)
    if source_id == dest_id:
        return _fail(state, "Pick two different warehouses")
    if by_id(state["warehouses"], source_id) is None or by_id(state["warehouses"], dest_id) is None:
        return _fail(state, "Warehouse not found")
    sku = by_id(state["skus"], sku_id)
    if sku is None:
        return _fail(state, "Unknown item")
    if not isinstance(qty, int) or qty <= 0:
        return _fail(state, "Quantity must be at least 1")
    source = find_stock(state, source_id, sku_id)
    if source is None or available(source) < qty:
        return _fail(state, "Not enough stock to move")
    dest = find_stock(state, dest_id, sku_id)
    if dest is None:
        dest = {
            "warehouseId": dest_id,
            "skuId": sku_id,
            "onHand": 0,
            "reserved": 0,
            "reorderAt": 10,
        }
        state["stock"].append(dest)
    source["onHand"] -= qty
    dest["onHand"] += qty
    source_name = by_id(state["warehouses"], source_id)["name"]
    dest_name = by_id(state["warehouses"], dest_id)["name"]
    _movement(state, source_id, sku_id, -qty, "Transfer to " + dest_name)
    _movement(state, dest_id, sku_id, qty, "Transfer from " + source_name)
    return state, None


def _next_reference(state):
    numbers = []
    for shipment in state["shipments"]:
        digits = "".join(ch for ch in shipment["reference"] if ch.isdigit())
        if digits:
            numbers.append(int(digits))
    return "LC-" + str(max(numbers or [18400]) + 1)


def create_shipment(state, payload):
    customer = str(payload.get("customer") or "").strip()
    origin_id = payload.get("originId")
    city = str(payload.get("destinationCity") or "").strip()
    address = str(payload.get("destinationAddress") or "").strip()
    priority = payload.get("priority") or "standard"
    lines = payload.get("lines") or []
    if len(customer) < 2:
        return state, None, "Customer name is too short"
    origin = by_id(state["warehouses"], origin_id)
    if origin is None:
        return state, None, "Warehouse not found"
    if not city:
        return state, None, "Choose a destination"
    if len(address) < 4:
        return state, None, "Add a destination address"
    if priority not in ("standard", "express"):
        return state, None, "Priority must be standard or express"
    if not lines:
        return state, None, "Add at least one line"
    needed = {}
    for line in lines:
        sku = by_id(state["skus"], line.get("skuId"))
        qty = line.get("qty")
        if sku is None:
            return state, None, "Unknown item"
        if not isinstance(qty, int) or qty < 1:
            return state, None, "Quantity must be at least 1"
        needed[sku["id"]] = needed.get(sku["id"], 0) + qty
    for sku_id, qty in needed.items():
        row = find_stock(state, origin_id, sku_id)
        sku = by_id(state["skus"], sku_id)
        if row is None or available(row) < qty:
            return state, None, "Not enough " + sku["name"] + " at " + origin["name"]
    try:
        dest_lat = float(payload.get("destLat"))
        dest_lng = float(payload.get("destLng"))
    except (TypeError, ValueError):
        return state, None, "Choose a destination"
    state = clone(state)
    origin = by_id(state["warehouses"], origin_id)
    for sku_id, qty in needed.items():
        find_stock(state, origin_id, sku_id)["reserved"] += qty
    distance = haversine_km(origin["lat"], origin["lng"], dest_lat, dest_lng)
    speed = 68 if priority == "express" else 46
    hours = max(0.75, distance / speed)
    eta = (datetime.now().astimezone() + timedelta(hours=hours)).isoformat(timespec="seconds")
    reference = _next_reference(state)
    shipment_id = uid("SH")
    names = []
    for sku_id in needed:
        names.append(by_id(state["skus"], sku_id)["name"])
    shipment = {
        "id": shipment_id,
        "reference": reference,
        "customer": customer,
        "originId": origin_id,
        "destinationCity": city,
        "destinationAddress": address,
        "destLat": dest_lat,
        "destLng": dest_lng,
        "priority": priority,
        "delayed": False,
        "status": "reserved",
        "lines": [{"skuId": sku_id, "qty": qty} for sku_id, qty in needed.items()],
        "vehicleId": None,
        "driverId": None,
        "distanceKm": round(distance, 1),
        "eta": eta,
        "createdAt": now_iso(),
        "events": [
            _event("Created", "Order opened for " + customer),
            _event("Stock reserved", ", ".join(names) + " held at " + origin["name"]),
        ],
    }
    state["shipments"].insert(0, shipment)
    return state, shipment_id, None


def _busy_vehicle(state, vehicle_id, except_id=None):
    for shipment in state["shipments"]:
        if shipment["id"] == except_id:
            continue
        if shipment["vehicleId"] == vehicle_id and shipment["status"] in OPEN:
            return shipment
    return None


def assign_shipment(state, shipment_id, vehicle_id):
    shipment = by_id(state["shipments"], shipment_id)
    if shipment is None:
        return state, "Shipment not found"
    if shipment["status"] in ("picked-up", "in-transit", "delivered"):
        return state, "Vehicle is locked in for this shipment"
    if shipment["status"] == "cancelled":
        return state, "Shipment is cancelled"
    vehicle = by_id(state["vehicles"], vehicle_id)
    if vehicle is None:
        return state, "Vehicle not found"
    if vehicle["kind"] == "coach":
        return state, "Coaches stay on passenger service"
    if vehicle["status"] == "maintenance":
        return state, "Vehicle is in the workshop"
    if not vehicle["driverId"]:
        return state, "Assign a driver before this vehicle can take a load"
    busy = _busy_vehicle(state, vehicle_id, shipment_id)
    if busy is not None:
        return state, "Vehicle is already on " + busy["reference"]
    state = clone(state)
    shipment = by_id(state["shipments"], shipment_id)
    vehicle = by_id(state["vehicles"], vehicle_id)
    driver = by_id(state["drivers"], vehicle["driverId"])
    shipment["vehicleId"] = vehicle["id"]
    shipment["driverId"] = driver["id"]
    if shipment["status"] == "reserved":
        shipment["status"] = "assigned"
    shipment["events"].append(
        _event("Vehicle assigned", vehicle["plate"] + " · " + driver["name"])
    )
    return state, None


def advance_shipment(state, shipment_id):
    shipment = by_id(state["shipments"], shipment_id)
    if shipment is None:
        return state, "Shipment not found"
    if shipment["status"] == "reserved":
        return state, "Assign a vehicle before pickup"
    if shipment["status"] not in NEXT_STATUS:
        return state, "Shipment can't move from " + shipment["status"]
    nxt = NEXT_STATUS[shipment["status"]]
    if nxt == "delivered":
        for line in shipment["lines"]:
            row = find_stock(state, shipment["originId"], line["skuId"])
            if row is None or row["onHand"] < line["qty"] or row["reserved"] < line["qty"]:
                return state, "Stock record is short for delivery"
    state = clone(state)
    shipment = by_id(state["shipments"], shipment_id)
    shipment["status"] = nxt
    vehicle = by_id(state["vehicles"], shipment["vehicleId"]) if shipment["vehicleId"] else None
    if nxt == "delivered":
        for line in shipment["lines"]:
            row = find_stock(state, shipment["originId"], line["skuId"])
            row["onHand"] -= line["qty"]
            row["reserved"] -= line["qty"]
            _movement(
                state,
                shipment["originId"],
                line["skuId"],
                -line["qty"],
                "Shipment " + shipment["reference"] + " delivered",
            )
        shipment["delayed"] = False
    if vehicle is not None:
        if nxt == "picked-up":
            vehicle["status"] = "loading"
            vehicle["heading"] = "Dock"
        elif nxt == "in-transit":
            vehicle["status"] = "en-route"
            vehicle["heading"] = shipment["destinationCity"]
        elif nxt == "delivered":
            still = _busy_vehicle(state, vehicle["id"], shipment["id"])
            if still is None:
                vehicle["status"] = "idle"
                vehicle["city"] = shipment["destinationCity"]
                vehicle["lat"] = shipment["destLat"]
                vehicle["lng"] = shipment["destLng"]
                vehicle["heading"] = "Delivered"
        vehicle["updatedAt"] = now_iso()
    detail = {
        "picked-up": "Loaded and signed out of the warehouse",
        "in-transit": "On the road to " + shipment["destinationCity"],
        "delivered": "Received at " + shipment["destinationAddress"],
    }[nxt]
    shipment["events"].append(_event(ADVANCE_LABEL[nxt], detail))
    return state, None


def cancel_shipment(state, shipment_id):
    shipment = by_id(state["shipments"], shipment_id)
    if shipment is None:
        return state, "Shipment not found"
    if shipment["status"] == "delivered":
        return state, "Delivered shipments stay on the record"
    if shipment["status"] in ("picked-up", "in-transit"):
        return state, "Shipment has already left the warehouse"
    if shipment["status"] == "cancelled":
        return state, "Shipment is already cancelled"
    state = clone(state)
    shipment = by_id(state["shipments"], shipment_id)
    for line in shipment["lines"]:
        row = find_stock(state, shipment["originId"], line["skuId"])
        if row is not None:
            row["reserved"] = max(0, row["reserved"] - line["qty"])
    shipment["status"] = "cancelled"
    shipment["vehicleId"] = None
    shipment["driverId"] = None
    shipment["events"].append(_event("Cancelled", "Reservation released back to available stock."))
    return state, None


def _fare(route, from_stop, to_stop, seat_count):
    names = [stop["name"] for stop in route["stops"]]
    hops = names.index(to_stop) - names.index(from_stop)
    span = max(1, len(names) - 1)
    return int(round(route["fareInr"] * (hops / float(span)) * seat_count))


def book_ticket(state, payload):
    trip = by_id(state["trips"], payload.get("tripId"))
    if trip is None:
        return state, None, "Trip not found"
    route = by_id(state["routes"], trip["routeId"])
    passenger = str(payload.get("passenger") or "").strip()
    phone = str(payload.get("phone") or "")
    origin = payload.get("fromStop")
    dest = payload.get("toStop")
    seats = payload.get("seats") or []
    if len(passenger) < 2:
        return state, None, "Enter the passenger name"
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 10:
        return state, None, "Enter a valid phone number"
    names = [stop["name"] for stop in route["stops"]]
    if origin not in names or dest not in names or names.index(origin) >= names.index(dest):
        return state, None, "Pick a different arrival stop"
    if not isinstance(seats, list) or not seats or len(seats) > 6:
        return state, None, "Choose between 1 and 6 seats"
    if len(set(seats)) != len(seats):
        return state, None, "Select each seat once"
    for seat in seats:
        if not isinstance(seat, int) or seat < 1 or seat > 40:
            return state, None, "Choose between 1 and 6 seats"
    taken = booked_seats(state, trip["id"])
    for seat in seats:
        if seat in taken:
            return state, None, "Seat " + str(seat) + " is already taken"
    state = clone(state)
    code = uid("TK")
    ticket = {
        "code": code,
        "tripId": trip["id"],
        "passenger": passenger,
        "phone": phone.strip(),
        "fromStop": origin,
        "toStop": dest,
        "seats": list(seats),
        "fareInr": _fare(route, origin, dest, len(seats)),
        "bookedAt": now_iso(),
        "status": "confirmed",
    }
    state["tickets"].insert(0, ticket)
    return state, code, None


def cancel_ticket(state, code):
    ticket = next((item for item in state["tickets"] if item["code"] == code), None)
    if ticket is None:
        return state, "Ticket not found"
    if ticket["status"] == "cancelled":
        return state, "Ticket is already cancelled"
    state = clone(state)
    ticket = next(item for item in state["tickets"] if item["code"] == code)
    ticket["status"] = "cancelled"
    return state, None


def dashboard(state, today=None):
    today = today or today_iso()
    low = []
    for row in state["stock"]:
        if available(row) <= row["reorderAt"]:
            sku = by_id(state["skus"], row["skuId"])
            warehouse = by_id(state["warehouses"], row["warehouseId"])
            low.append(
                {
                    "warehouseId": row["warehouseId"],
                    "warehouse": warehouse["name"] if warehouse else row["warehouseId"],
                    "skuId": row["skuId"],
                    "sku": sku["name"] if sku else row["skuId"],
                    "available": available(row),
                    "reorderAt": row["reorderAt"],
                }
            )
    overdue = [
        job
        for job in state["maintenance"]
        if job["status"] != "done" and job["dueDate"] < today
    ]
    return {
        "vehicles": len(state["vehicles"]),
        "activeVehicles": len(
            [v for v in state["vehicles"] if v["status"] in ("en-route", "loading")]
        ),
        "openShipments": len([s for s in state["shipments"] if s["status"] in OPEN]),
        "delayedShipments": len(
            [s for s in state["shipments"] if s.get("delayed") and s["status"] in OPEN]
        ),
        "confirmedTickets": len([t for t in state["tickets"] if t["status"] == "confirmed"]),
        "lowStock": low,
        "overdueMaintenance": len(overdue),
    }
