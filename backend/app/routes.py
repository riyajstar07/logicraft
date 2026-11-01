from fastapi import APIRouter, HTTPException

from app import domain
from app.db import load_state, reset_state, save_state
from app.schemas import (
    AdjustBody,
    AssignVehicleBody,
    DriverBody,
    MaintenanceBody,
    ShipmentBody,
    TicketBody,
    TransferBody,
)

router = APIRouter(prefix="/api")


def _commit(state, err, payload):
    if err:
        raise HTTPException(status_code=400, detail=err)
    save_state(state)
    return payload


def _shipment(state, shipment_id):
    return domain.by_id(state["shipments"], shipment_id)


@router.get("/health")
def health():
    return {"ok": True, "service": "logicraft"}


@router.get("/dashboard")
def dashboard_view():
    return domain.dashboard(load_state())


@router.get("/state")
def full_state():
    return load_state()


@router.post("/reset")
def reset():
    return reset_state()


@router.get("/vehicles")
def vehicles():
    return load_state()["vehicles"]


@router.post("/vehicles/{vehicle_id}/driver")
def set_driver(vehicle_id: str, body: DriverBody):
    state, err = domain.assign_driver(load_state(), vehicle_id, body.driverId)
    return _commit(state, err, domain.by_id(state["vehicles"], vehicle_id))


@router.post("/maintenance")
def schedule(body: MaintenanceBody):
    state, err = domain.schedule_maintenance(
        load_state(), body.vehicleId, body.type, body.dueDate, body.notes
    )
    return _commit(state, err, state["maintenance"][0] if not err else None)


@router.post("/maintenance/{job_id}/complete")
def complete(job_id: str):
    state, err = domain.complete_maintenance(load_state(), job_id)
    return _commit(state, err, domain.by_id(state["maintenance"], job_id))


@router.post("/vehicles/{vehicle_id}/workshop")
def workshop(vehicle_id: str):
    state, err = domain.send_to_workshop(load_state(), vehicle_id)
    return _commit(state, err, domain.by_id(state["vehicles"], vehicle_id))


@router.get("/inventory")
def inventory():
    state = load_state()
    rows = []
    for row in state["stock"]:
        sku = domain.by_id(state["skus"], row["skuId"])
        warehouse = domain.by_id(state["warehouses"], row["warehouseId"])
        rows.append(
            {
                **row,
                "available": domain.available(row),
                "sku": sku["name"] if sku else row["skuId"],
                "unit": sku["unit"] if sku else "",
                "warehouse": warehouse["name"] if warehouse else row["warehouseId"],
            }
        )
    return rows


@router.post("/inventory/adjust")
def adjust(body: AdjustBody):
    state, err = domain.adjust_stock(
        load_state(), body.warehouseId, body.skuId, body.delta, body.reason
    )
    return _commit(state, err, domain.find_stock(state, body.warehouseId, body.skuId))


@router.post("/inventory/transfer")
def transfer(body: TransferBody):
    state, err = domain.transfer_stock(
        load_state(), body.fromWarehouseId, body.toWarehouseId, body.skuId, body.qty
    )
    return _commit(
        state,
        err,
        {
            "from": domain.find_stock(state, body.fromWarehouseId, body.skuId),
            "to": domain.find_stock(state, body.toWarehouseId, body.skuId),
        },
    )


@router.get("/shipments")
def shipments():
    return load_state()["shipments"]


@router.get("/shipments/{shipment_id}")
def shipment_detail(shipment_id: str):
    shipment = _shipment(load_state(), shipment_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@router.post("/shipments")
def create_shipment(body: ShipmentBody):
    state, shipment_id, err = domain.create_shipment(load_state(), body.model_dump())
    return _commit(state, err, _shipment(state, shipment_id))


@router.post("/shipments/{shipment_id}/assign")
def assign_shipment(shipment_id: str, body: AssignVehicleBody):
    state, err = domain.assign_shipment(load_state(), shipment_id, body.vehicleId)
    return _commit(state, err, _shipment(state, shipment_id))


@router.post("/shipments/{shipment_id}/advance")
def advance(shipment_id: str):
    state, err = domain.advance_shipment(load_state(), shipment_id)
    return _commit(state, err, _shipment(state, shipment_id))


@router.post("/shipments/{shipment_id}/cancel")
def cancel_shipment(shipment_id: str):
    state, err = domain.cancel_shipment(load_state(), shipment_id)
    return _commit(state, err, _shipment(state, shipment_id))


@router.get("/routes")
def routes():
    return load_state()["routes"]


@router.get("/trips")
def trips():
    state = load_state()
    payload = []
    for trip in state["trips"]:
        payload.append({**trip, "takenSeats": sorted(domain.booked_seats(state, trip["id"]))})
    return payload


@router.post("/tickets")
def book(body: TicketBody):
    state, code, err = domain.book_ticket(load_state(), body.model_dump())
    ticket = next((item for item in state["tickets"] if item["code"] == code), None)
    return _commit(state, err, ticket)


@router.get("/tickets/{code}")
def ticket_detail(code: str):
    state = load_state()
    ticket = next((item for item in state["tickets"] if item["code"] == code), None)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/tickets/{code}/cancel")
def cancel_ticket(code: str):
    state, err = domain.cancel_ticket(load_state(), code)
    ticket = next((item for item in state["tickets"] if item["code"] == code), None)
    return _commit(state, err, ticket)
