import type {
  Route,
  Shipment,
  ShipmentInput,
  State,
  Stock,
  TicketInput,
} from "./types"

const OPEN = new Set(["reserved", "assigned", "picked-up", "in-transit"])
const NEXT_STATUS: Record<string, string> = {
  assigned: "picked-up",
  "picked-up": "in-transit",
  "in-transit": "delivered",
}
const ADVANCE_LABEL: Record<string, string> = {
  "picked-up": "Picked up",
  "in-transit": "In transit",
  delivered: "Delivered",
}

export const DESTINATIONS = [
  { city: "Pune", address: "Koregaon Park receiving, Pune", lat: 18.5204, lng: 73.8567 },
  { city: "Surat", address: "Ring Road DC, Surat", lat: 21.1702, lng: 72.8311 },
  { city: "Hyderabad", address: "Gachibowli goods gate, Hyderabad", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", address: "Porur cold room, Chennai", lat: 13.0827, lng: 80.2707 },
  { city: "Jaipur", address: "Sitapura industrial area, Jaipur", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", address: "Transport Nagar, Lucknow", lat: 26.8467, lng: 80.9462 },
  { city: "Nashik", address: "Satpur MIDC, Nashik", lat: 19.9975, lng: 73.7898 },
  { city: "Ahmedabad", address: "Narol goods yard, Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { city: "Nagpur", address: "Kalamna market, Nagpur", lat: 21.1458, lng: 79.0882 },
  { city: "Indore", address: "Sanwer Road warehouse, Indore", lat: 22.7196, lng: 75.8577 },
]

export const SERVICE_TYPES = [
  "Oil service",
  "Brake inspection",
  "Tyre rotation",
  "Reefer unit check",
  "General service",
]

export type Mutation = { state: State; error: string | null }
export type Created = Mutation & { id: string | null }
export type Booked = Mutation & { code: string | null }

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function todayIso(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function nowIso() {
  return new Date().toISOString()
}

function uid(prefix: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let body = ""
  for (let i = 0; i < 6; i += 1) body += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `${prefix}-${body}`
}

export function byId<T extends { id: string }>(items: T[], id: string | null | undefined) {
  if (!id) return undefined
  return items.find((item) => item.id === id)
}

export function available(row: Stock) {
  return row.onHand - row.reserved
}

export function findStock(state: State, warehouseId: string, skuId: string) {
  return state.stock.find((row) => row.warehouseId === warehouseId && row.skuId === skuId)
}

export function bookedSeats(state: State, tripId: string) {
  const taken = new Set<number>()
  for (const ticket of state.tickets) {
    if (ticket.tripId === tripId && ticket.status === "confirmed") {
      ticket.seats.forEach((seat) => taken.add(seat))
    }
  }
  return taken
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function quoteFare(route: Route, fromStop: string, toStop: string, seatCount: number) {
  const names = route.stops.map((stop) => stop.name)
  const hops = names.indexOf(toStop) - names.indexOf(fromStop)
  if (hops <= 0 || seatCount < 1) return 0
  return Math.round(route.fareInr * (hops / Math.max(1, names.length - 1)) * seatCount)
}

export function serviceWindow(departTime: string, durationMin: number, now = new Date()) {
  const [hh, mm] = departTime.split(":").map(Number)
  const start = new Date(now)
  start.setHours(hh, mm, 0, 0)
  const end = start.getTime() + durationMin * 60000
  const t = now.getTime()
  if (t < start.getTime()) return { phase: "upcoming" as const, progress: 0 }
  if (t > end) return { phase: "completed" as const, progress: 1 }
  return { phase: "live" as const, progress: (t - start.getTime()) / (end - start.getTime()) }
}

export function pointAlong(stops: { lat: number; lng: number }[], progress: number) {
  if (progress <= 0) return stops[0]
  if (progress >= 1) return stops[stops.length - 1]
  const scaled = progress * (stops.length - 1)
  const index = Math.min(stops.length - 2, Math.floor(scaled))
  const t = scaled - index
  return {
    lat: stops[index].lat + (stops[index + 1].lat - stops[index].lat) * t,
    lng: stops[index].lng + (stops[index + 1].lng - stops[index].lng) * t,
  }
}

function event(label: string, detail: string) {
  return { at: nowIso(), label, detail }
}

function movement(state: State, warehouseId: string, skuId: string, delta: number, reason: string) {
  state.movements.unshift({
    id: uid("MV"),
    at: nowIso(),
    warehouseId,
    skuId,
    delta,
    reason,
  })
}

function fail(state: State, error: string): Mutation {
  return { state, error }
}

function busyVehicle(state: State, vehicleId: string, exceptId?: string) {
  return state.shipments.find(
    (shipment) =>
      shipment.id !== exceptId && shipment.vehicleId === vehicleId && OPEN.has(shipment.status),
  )
}

function park(state: State, vehicleId: string) {
  const vehicle = byId(state.vehicles, vehicleId)
  if (!vehicle) return
  if (vehicle.driverId) {
    const driver = byId(state.drivers, vehicle.driverId)
    if (driver && driver.status !== "leave") driver.status = "off-duty"
    vehicle.driverId = null
  }
  vehicle.status = "maintenance"
  vehicle.heading = "Workshop"
  vehicle.updatedAt = nowIso()
}

export function assignDriver(input: State, vehicleId: string, driverId: string | null): Mutation {
  const state = clone(input)
  const vehicle = byId(state.vehicles, vehicleId)
  if (!vehicle) return fail(input, "Vehicle not found")
  if (vehicle.status === "maintenance") return fail(input, "Vehicle is in the workshop")
  if (!driverId) {
    const previous = byId(state.drivers, vehicle.driverId)
    vehicle.driverId = null
    if (previous) previous.status = "off-duty"
    vehicle.updatedAt = nowIso()
    return { state, error: null }
  }
  const driver = byId(state.drivers, driverId)
  if (!driver) return fail(input, "Driver not found")
  if (driver.status === "leave") return fail(input, "That driver is on leave")
  for (const other of state.vehicles) {
    if (other.driverId === driverId) other.driverId = null
  }
  if (vehicle.driverId && vehicle.driverId !== driverId) {
    const previous = byId(state.drivers, vehicle.driverId)
    if (previous && previous.status !== "leave") previous.status = "off-duty"
  }
  vehicle.driverId = driverId
  driver.status = "on-duty"
  vehicle.updatedAt = nowIso()
  return { state, error: null }
}

export function scheduleMaintenance(
  input: State,
  vehicleId: string,
  kind: string,
  dueDate: string,
  notes: string,
  today = todayIso(),
): Mutation {
  const vehicle = byId(input.vehicles, vehicleId)
  if (!vehicle) return fail(input, "Vehicle not found")
  if (!kind.trim()) return fail(input, "Choose a service type")
  if (dueDate.length !== 10) return fail(input, "Choose a due date")
  const state = clone(input)
  const current = byId(state.vehicles, vehicleId)!
  state.maintenance.unshift({
    id: uid("MN"),
    vehicleId,
    type: kind.trim(),
    dueDate,
    status: "scheduled",
    notes: notes.trim(),
    workshop: `${current.city} yard`,
  })
  if (dueDate <= today) park(state, vehicleId)
  return { state, error: null }
}

export function sendToWorkshop(input: State, vehicleId: string, today = todayIso()): Mutation {
  const vehicle = byId(input.vehicles, vehicleId)
  if (!vehicle) return fail(input, "Vehicle not found")
  if (vehicle.status === "maintenance") return fail(input, "Already in the workshop")
  const state = clone(input)
  const open = state.maintenance.some((job) => job.vehicleId === vehicleId && job.status !== "done")
  if (!open) {
    const current = byId(state.vehicles, vehicleId)!
    state.maintenance.unshift({
      id: uid("MN"),
      vehicleId,
      type: "General service",
      dueDate: today,
      status: "scheduled",
      notes: "Called in from the yard.",
      workshop: `${current.city} yard`,
    })
  }
  park(state, vehicleId)
  return { state, error: null }
}

export function completeMaintenance(input: State, jobId: string): Mutation {
  const state = clone(input)
  const job = byId(state.maintenance, jobId)
  if (!job) return fail(input, "Maintenance record not found")
  if (job.status === "done") return fail(input, "This job is already done")
  job.status = "done"
  const stillOpen = state.maintenance.some(
    (item) => item.vehicleId === job.vehicleId && item.status !== "done",
  )
  const vehicle = byId(state.vehicles, job.vehicleId)
  if (vehicle && !stillOpen) {
    vehicle.status = "idle"
    vehicle.heading = "Yard"
    vehicle.updatedAt = nowIso()
  }
  return { state, error: null }
}

export function adjustStock(
  input: State,
  warehouseId: string,
  skuId: string,
  delta: number,
  reason: string,
): Mutation {
  if (!byId(input.warehouses, warehouseId)) return fail(input, "Warehouse not found")
  if (!byId(input.skus, skuId)) return fail(input, "Unknown item")
  if (!Number.isInteger(delta) || delta === 0) return fail(input, "Enter a quantity other than zero")
  if (reason.trim().length < 3) return fail(input, "Tell us why this count changed")
  const state = clone(input)
  let row = findStock(state, warehouseId, skuId)
  if (!row) {
    if (delta < 0) return fail(input, "Not enough stock to move")
    row = { warehouseId, skuId, onHand: 0, reserved: 0, reorderAt: 10 }
    state.stock.push(row)
  }
  if (row.onHand + delta < row.reserved) {
    return fail(input, "That would drop stock below what is already reserved")
  }
  row.onHand += delta
  movement(state, warehouseId, skuId, delta, reason.trim())
  return { state, error: null }
}

export function transferStock(
  input: State,
  sourceId: string,
  destId: string,
  skuId: string,
  qty: number,
): Mutation {
  if (sourceId === destId) return fail(input, "Pick two different warehouses")
  if (!byId(input.warehouses, sourceId) || !byId(input.warehouses, destId)) {
    return fail(input, "Warehouse not found")
  }
  const sku = byId(input.skus, skuId)
  if (!sku) return fail(input, "Unknown item")
  if (!Number.isInteger(qty) || qty <= 0) return fail(input, "Quantity must be at least 1")
  const source = findStock(input, sourceId, skuId)
  if (!source || available(source) < qty) return fail(input, "Not enough stock to move")
  const state = clone(input)
  const from = findStock(state, sourceId, skuId)!
  let dest = findStock(state, destId, skuId)
  if (!dest) {
    dest = { warehouseId: destId, skuId, onHand: 0, reserved: 0, reorderAt: 10 }
    state.stock.push(dest)
  }
  from.onHand -= qty
  dest.onHand += qty
  const sourceName = byId(state.warehouses, sourceId)!.name
  const destName = byId(state.warehouses, destId)!.name
  movement(state, sourceId, skuId, -qty, `Transfer to ${destName}`)
  movement(state, destId, skuId, qty, `Transfer from ${sourceName}`)
  return { state, error: null }
}

function nextReference(state: State) {
  const numbers = state.shipments
    .map((shipment) => Number(shipment.reference.replace(/\D/g, "")))
    .filter((value) => !Number.isNaN(value))
  return `LC-${Math.max(18400, ...numbers) + 1}`
}

export function createShipment(input: State, payload: ShipmentInput): Created {
  const customer = payload.customer.trim()
  const city = payload.destinationCity.trim()
  const address = payload.destinationAddress.trim()
  if (customer.length < 2) return { state: input, error: "Customer name is too short", id: null }
  const origin = byId(input.warehouses, payload.originId)
  if (!origin) return { state: input, error: "Warehouse not found", id: null }
  if (!city) return { state: input, error: "Choose a destination", id: null }
  if (address.length < 4) return { state: input, error: "Add a destination address", id: null }
  if (payload.priority !== "standard" && payload.priority !== "express") {
    return { state: input, error: "Priority must be standard or express", id: null }
  }
  if (!payload.lines.length) return { state: input, error: "Add at least one line", id: null }
  const needed = new Map<string, number>()
  for (const line of payload.lines) {
    const sku = byId(input.skus, line.skuId)
    if (!sku) return { state: input, error: "Unknown item", id: null }
    if (!Number.isInteger(line.qty) || line.qty < 1) {
      return { state: input, error: "Quantity must be at least 1", id: null }
    }
    needed.set(sku.id, (needed.get(sku.id) ?? 0) + line.qty)
  }
  for (const [skuId, qty] of needed) {
    const row = findStock(input, payload.originId, skuId)
    const sku = byId(input.skus, skuId)!
    if (!row || available(row) < qty) {
      return { state: input, error: `Not enough ${sku.name} at ${origin.name}`, id: null }
    }
  }
  const state = clone(input)
  const warehouse = byId(state.warehouses, payload.originId)!
  for (const [skuId, qty] of needed) findStock(state, payload.originId, skuId)!.reserved += qty
  const distance = haversineKm(warehouse.lat, warehouse.lng, payload.destLat, payload.destLng)
  const speed = payload.priority === "express" ? 68 : 46
  const hours = Math.max(0.75, distance / speed)
  const names = [...needed.keys()].map((skuId) => byId(state.skus, skuId)!.name)
  const shipment: Shipment = {
    id: uid("SH"),
    reference: nextReference(state),
    customer,
    originId: payload.originId,
    destinationCity: city,
    destinationAddress: address,
    destLat: payload.destLat,
    destLng: payload.destLng,
    priority: payload.priority,
    delayed: false,
    status: "reserved",
    lines: [...needed.entries()].map(([skuId, qty]) => ({ skuId, qty })),
    vehicleId: null,
    driverId: null,
    distanceKm: Math.round(distance * 10) / 10,
    eta: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
    createdAt: nowIso(),
    events: [
      event("Created", `Order opened for ${customer}`),
      event("Stock reserved", `${names.join(", ")} held at ${warehouse.name}`),
    ],
  }
  state.shipments.unshift(shipment)
  return { state, error: null, id: shipment.id }
}

export function assignShipment(input: State, shipmentId: string, vehicleId: string): Mutation {
  const shipment = byId(input.shipments, shipmentId)
  if (!shipment) return fail(input, "Shipment not found")
  if (shipment.status === "picked-up" || shipment.status === "in-transit" || shipment.status === "delivered") {
    return fail(input, "Vehicle is locked in for this shipment")
  }
  if (shipment.status === "cancelled") return fail(input, "Shipment is cancelled")
  const vehicle = byId(input.vehicles, vehicleId)
  if (!vehicle) return fail(input, "Vehicle not found")
  if (vehicle.kind === "coach") return fail(input, "Coaches stay on passenger service")
  if (vehicle.status === "maintenance") return fail(input, "Vehicle is in the workshop")
  if (!vehicle.driverId) return fail(input, "Assign a driver before this vehicle can take a load")
  const busy = busyVehicle(input, vehicleId, shipmentId)
  if (busy) return fail(input, `Vehicle is already on ${busy.reference}`)
  const state = clone(input)
  const next = byId(state.shipments, shipmentId)!
  const chosen = byId(state.vehicles, vehicleId)!
  const driver = byId(state.drivers, chosen.driverId)!
  next.vehicleId = chosen.id
  next.driverId = driver.id
  if (next.status === "reserved") next.status = "assigned"
  next.events.push(event("Vehicle assigned", `${chosen.plate} · ${driver.name}`))
  return { state, error: null }
}

export function advanceShipment(input: State, shipmentId: string): Mutation {
  const current = byId(input.shipments, shipmentId)
  if (!current) return fail(input, "Shipment not found")
  if (current.status === "reserved") return fail(input, "Assign a vehicle before pickup")
  const nxt = NEXT_STATUS[current.status]
  if (!nxt) return fail(input, `Shipment can't move from ${current.status}`)
  if (nxt === "delivered") {
    for (const line of current.lines) {
      const row = findStock(input, current.originId, line.skuId)
      if (!row || row.onHand < line.qty || row.reserved < line.qty) {
        return fail(input, "Stock record is short for delivery")
      }
    }
  }
  const state = clone(input)
  const shipment = byId(state.shipments, shipmentId)!
  shipment.status = nxt as Shipment["status"]
  const vehicle = byId(state.vehicles, shipment.vehicleId)
  if (nxt === "delivered") {
    for (const line of shipment.lines) {
      const row = findStock(state, shipment.originId, line.skuId)!
      row.onHand -= line.qty
      row.reserved -= line.qty
      movement(state, shipment.originId, line.skuId, -line.qty, `Shipment ${shipment.reference} delivered`)
    }
    shipment.delayed = false
  }
  if (vehicle) {
    if (nxt === "picked-up") {
      vehicle.status = "loading"
      vehicle.heading = "Dock"
    } else if (nxt === "in-transit") {
      vehicle.status = "en-route"
      vehicle.heading = shipment.destinationCity
    } else if (nxt === "delivered" && !busyVehicle(state, vehicle.id, shipment.id)) {
      vehicle.status = "idle"
      vehicle.city = shipment.destinationCity
      vehicle.lat = shipment.destLat
      vehicle.lng = shipment.destLng
      vehicle.heading = "Delivered"
    }
    vehicle.updatedAt = nowIso()
  }
  const detail =
    nxt === "picked-up"
      ? "Loaded and signed out of the warehouse"
      : nxt === "in-transit"
        ? `On the road to ${shipment.destinationCity}`
        : `Received at ${shipment.destinationAddress}`
  shipment.events.push(event(ADVANCE_LABEL[nxt], detail))
  return { state, error: null }
}

export function cancelShipment(input: State, shipmentId: string): Mutation {
  const current = byId(input.shipments, shipmentId)
  if (!current) return fail(input, "Shipment not found")
  if (current.status === "delivered") return fail(input, "Delivered shipments stay on the record")
  if (current.status === "picked-up" || current.status === "in-transit") {
    return fail(input, "Shipment has already left the warehouse")
  }
  if (current.status === "cancelled") return fail(input, "Shipment is already cancelled")
  const state = clone(input)
  const shipment = byId(state.shipments, shipmentId)!
  for (const line of shipment.lines) {
    const row = findStock(state, shipment.originId, line.skuId)
    if (row) row.reserved = Math.max(0, row.reserved - line.qty)
  }
  shipment.status = "cancelled"
  shipment.vehicleId = null
  shipment.driverId = null
  shipment.events.push(event("Cancelled", "Reservation released back to available stock."))
  return { state, error: null }
}

export function bookTicket(input: State, payload: TicketInput): Booked {
  const trip = byId(input.trips, payload.tripId)
  if (!trip) return { state: input, error: "Trip not found", code: null }
  const route = byId(input.routes, trip.routeId)
  if (!route) return { state: input, error: "Trip not found", code: null }
  const passenger = payload.passenger.trim()
  if (passenger.length < 2) return { state: input, error: "Enter the passenger name", code: null }
  const digits = payload.phone.replace(/\D/g, "")
  if (digits.length < 10) return { state: input, error: "Enter a valid phone number", code: null }
  const names = route.stops.map((stop) => stop.name)
  if (!names.includes(payload.fromStop) || !names.includes(payload.toStop) || names.indexOf(payload.fromStop) >= names.indexOf(payload.toStop)) {
    return { state: input, error: "Pick a different arrival stop", code: null }
  }
  const seats = payload.seats
  if (!seats.length || seats.length > 6) return { state: input, error: "Choose between 1 and 6 seats", code: null }
  if (new Set(seats).size !== seats.length) return { state: input, error: "Select each seat once", code: null }
  if (seats.some((seat) => !Number.isInteger(seat) || seat < 1 || seat > 40)) {
    return { state: input, error: "Choose between 1 and 6 seats", code: null }
  }
  const taken = bookedSeats(input, trip.id)
  for (const seat of seats) {
    if (taken.has(seat)) return { state: input, error: `Seat ${seat} is already taken`, code: null }
  }
  const state = clone(input)
  const code = uid("TK")
  state.tickets.unshift({
    code,
    tripId: trip.id,
    passenger,
    phone: payload.phone.trim(),
    fromStop: payload.fromStop,
    toStop: payload.toStop,
    seats: [...seats],
    fareInr: quoteFare(route, payload.fromStop, payload.toStop, seats.length),
    bookedAt: nowIso(),
    status: "confirmed",
  })
  return { state, error: null, code }
}

export function cancelTicket(input: State, code: string): Mutation {
  const current = input.tickets.find((ticket) => ticket.code === code)
  if (!current) return fail(input, "Ticket not found")
  if (current.status === "cancelled") return fail(input, "Ticket is already cancelled")
  const state = clone(input)
  const ticket = state.tickets.find((item) => item.code === code)!
  ticket.status = "cancelled"
  return { state, error: null }
}

export function jobTone(status: string, dueDate: string, today = todayIso()) {
  if (status === "done") return "done"
  if (dueDate < today) return "overdue"
  return "scheduled"
}
