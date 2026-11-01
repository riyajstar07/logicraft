"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Back, ErrorNote, OpsMap, Pill } from "@/components/ui"
import { labelize, num, when } from "@/lib/format"
import { byId } from "@/lib/logic"
import { useStore } from "@/lib/store"

const STEPS = ["reserved", "assigned", "picked-up", "in-transit", "delivered"]
const NEXT_LABEL: Record<string, string> = {
  assigned: "Mark picked up",
  "picked-up": "Mark in transit",
  "in-transit": "Mark delivered",
}

export default function ShipmentPage() {
  const params = useParams<{ id: string }>()
  const { state, assignShipment, advanceShipment, cancelShipment } = useStore()
  const [error, setError] = useState<string | null>(null)
  const [vehicleId, setVehicleId] = useState("")
  const shipment = state.shipments.find((item) => item.id === params.id || item.reference === params.id)

  if (!shipment) {
    return (
      <div>
        <Back href="/shipments">← Shipments</Back>
        <h1 className="mt-4 text-2xl font-semibold">That shipment is not on the board</h1>
      </div>
    )
  }

  const origin = byId(state.warehouses, shipment.originId)
  const vehicle = byId(state.vehicles, shipment.vehicleId)
  const driver = byId(state.drivers, shipment.driverId)
  const step = STEPS.indexOf(shipment.status)
  const choices = state.vehicles.filter((item) => item.kind !== "coach" && item.status !== "maintenance" && item.driverId)

  const points = [
    origin ? { id: origin.id, lat: origin.lat, lng: origin.lng, label: origin.code, tone: "warehouse" as const } : null,
    { id: "dest", lat: shipment.destLat, lng: shipment.destLng, label: shipment.destinationCity, tone: "ink" as const },
    vehicle ? { id: vehicle.id, lat: vehicle.lat, lng: vehicle.lng, label: vehicle.plate, tone: "accent" as const } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <div>
      <Back href="/shipments">← Shipments</Back>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-mute">{shipment.reference}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{shipment.customer}</h1>
          <p className="mt-2 text-sm text-mute">
            {origin?.name} → {shipment.destinationCity} · {num(shipment.distanceKm)} km · ETA {when(shipment.eta)}
          </p>
        </div>
        <div className="flex gap-2">
          <Pill value={shipment.priority} />
          <Pill value={shipment.status} />
          {shipment.delayed && shipment.status !== "delivered" && shipment.status !== "cancelled" ? <Pill value="delayed">Delayed</Pill> : null}
        </div>
      </div>
      {shipment.status !== "cancelled" ? (
        <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STEPS.map((item, index) => (
            <li key={item} className={`rounded-xl border px-3 py-2 text-sm ${index <= step ? "border-accent bg-emerald-50" : "border-line bg-white text-mute"}`}>
              {index + 1}. {labelize(item)}
            </li>
          ))}
        </ol>
      ) : null}
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="card p-3 lg:col-span-3">
          <OpsMap points={points} />
        </div>
        <div className="card grid content-start gap-3 p-4 lg:col-span-2">
          <p className="text-sm font-medium">Lines</p>
          <ul className="text-sm">
            {shipment.lines.map((line) => {
              const sku = byId(state.skus, line.skuId)
              return (
                <li key={line.skuId} className="flex justify-between border-b border-line py-2">
                  <span>{sku?.name}</span>
                  <span>{line.qty} {sku?.unit}</span>
                </li>
              )
            })}
          </ul>
          <p className="text-sm text-mute">{shipment.destinationAddress}</p>
          {vehicle ? (
            <p className="text-sm">{vehicle.plate} · {driver?.name ?? "No driver"}</p>
          ) : (
            <p className="text-sm text-mute">No vehicle assigned.</p>
          )}
          {shipment.status === "reserved" || shipment.status === "assigned" ? (
            <div className="grid gap-2">
              <select className="field" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} aria-label="Assign vehicle">
                <option value="">Choose a vehicle</option>
                {choices.map((item) => {
                  const person = byId(state.drivers, item.driverId)
                  return (
                    <option key={item.id} value={item.id}>
                      {item.plate} · {person?.name} · {item.city}
                    </option>
                  )
                })}
              </select>
              <button
                className="btn"
                disabled={!vehicleId}
                onClick={() => setError(assignShipment(shipment.id, vehicleId))}
              >
                Assign vehicle
              </button>
            </div>
          ) : null}
          {NEXT_LABEL[shipment.status] ? (
            <button className="btn-accent" onClick={() => setError(advanceShipment(shipment.id))}>
              {NEXT_LABEL[shipment.status]}
            </button>
          ) : null}
          {shipment.status === "reserved" || shipment.status === "assigned" ? (
            <button className="btn-ghost" onClick={() => setError(cancelShipment(shipment.id))}>
              Cancel and release stock
            </button>
          ) : null}
        </div>
      </div>
      <section className="card mt-4">
        <p className="border-b border-line px-4 py-3 text-sm font-medium">Timeline</p>
        <ol>
          {[...shipment.events].reverse().map((event) => (
            <li key={event.at + event.label} className="grid grid-cols-[140px_1fr] gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <time className="text-xs text-mute">{when(event.at)}</time>
              <div>
                <p className="text-sm font-medium">{event.label}</p>
                <p className="text-sm text-mute">{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
