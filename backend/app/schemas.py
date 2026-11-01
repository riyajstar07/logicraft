from typing import List, Optional

from pydantic import BaseModel, Field


class DriverBody(BaseModel):
    driverId: Optional[str] = None


class MaintenanceBody(BaseModel):
    vehicleId: str
    type: str
    dueDate: str
    notes: str = ""


class AdjustBody(BaseModel):
    warehouseId: str
    skuId: str
    delta: int
    reason: str


class TransferBody(BaseModel):
    fromWarehouseId: str
    toWarehouseId: str
    skuId: str
    qty: int


class LineBody(BaseModel):
    skuId: str
    qty: int


class ShipmentBody(BaseModel):
    customer: str
    originId: str
    destinationCity: str
    destinationAddress: str
    destLat: float
    destLng: float
    priority: str = "standard"
    lines: List[LineBody] = Field(default_factory=list)


class AssignVehicleBody(BaseModel):
    vehicleId: str


class TicketBody(BaseModel):
    tripId: str
    passenger: str
    phone: str
    fromStop: str
    toStop: str
    seats: List[int]
