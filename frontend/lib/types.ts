export type DriverStatus = "on-duty" | "off-duty" | "leave"
export type VehicleStatus = "en-route" | "idle" | "loading" | "maintenance"
export type VehicleKind = "truck" | "van" | "reefer" | "coach"
export type ShipmentStatus =
  | "reserved"
  | "assigned"
  | "picked-up"
  | "in-transit"
  | "delivered"
  | "cancelled"
export type Priority = "standard" | "express"
export type JobStatus = "scheduled" | "done"
export type TicketStatus = "confirmed" | "cancelled"

export type Driver = {
  id: string
  name: string
  phone: string
  license: string
  status: DriverStatus
  rating: number
  hoursToday: number
  hub: string
}

export type Vehicle = {
  id: string
  plate: string
  kind: VehicleKind
  make: string
  capacityKg: number
  seats: number | null
  fuelPct: number
  odometerKm: number
  status: VehicleStatus
  driverId: string | null
  lat: number
  lng: number
  city: string
  heading: string
  updatedAt: string
}

export type Maintenance = {
  id: string
  vehicleId: string
  type: string
  dueDate: string
  status: JobStatus
  notes: string
  workshop: string
}

export type Warehouse = {
  id: string
  name: string
  code: string
  city: string
  address: string
  lat: number
  lng: number
  capacityUnits: number
  manager: string
}

export type Sku = {
  id: string
  name: string
  unit: string
  category: string
}

export type Stock = {
  warehouseId: string
  skuId: string
  onHand: number
  reserved: number
  reorderAt: number
}

export type Movement = {
  id: string
  at: string
  warehouseId: string
  skuId: string
  delta: number
  reason: string
}

export type Line = { skuId: string; qty: number }
export type ShipmentEvent = { at: string; label: string; detail: string }

export type Shipment = {
  id: string
  reference: string
  customer: string
  originId: string
  destinationCity: string
  destinationAddress: string
  destLat: number
  destLng: number
  priority: Priority
  delayed: boolean
  status: ShipmentStatus
  lines: Line[]
  vehicleId: string | null
  driverId: string | null
  distanceKm: number
  eta: string
  createdAt: string
  events: ShipmentEvent[]
}

export type Stop = { name: string; lat: number; lng: number }

export type Route = {
  id: string
  code: string
  name: string
  city: string
  fareInr: number
  stops: Stop[]
}

export type Trip = {
  id: string
  routeId: string
  vehicleId: string
  driverId: string
  departTime: string
  durationMin: number
}

export type Ticket = {
  code: string
  tripId: string
  passenger: string
  phone: string
  fromStop: string
  toStop: string
  seats: number[]
  fareInr: number
  bookedAt: string
  status: TicketStatus
}

export type State = {
  drivers: Driver[]
  vehicles: Vehicle[]
  maintenance: Maintenance[]
  warehouses: Warehouse[]
  skus: Sku[]
  stock: Stock[]
  movements: Movement[]
  shipments: Shipment[]
  routes: Route[]
  trips: Trip[]
  tickets: Ticket[]
}

export type ShipmentInput = {
  customer: string
  originId: string
  destinationCity: string
  destinationAddress: string
  destLat: number
  destLng: number
  priority: Priority
  lines: Line[]
}

export type TicketInput = {
  tripId: string
  passenger: string
  phone: string
  fromStop: string
  toStop: string
  seats: number[]
}
