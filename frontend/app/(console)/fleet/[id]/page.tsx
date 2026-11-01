"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { Back, ErrorNote, OpsMap, Pill } from "@/components/ui"
import { labelize, num, when } from "@/lib/format"
import { byId, jobTone, todayIso } from "@/lib/logic"
import { useStore } from "@/lib/store"

export default function VehiclePage() {
  const params = useParams<{ id: string }>()
  const { state, assignDriver, sendToWorkshop } = useStore()
  const [error, setError] = useState<string | null>(null)
  const vehicle = byId(state.vehicles, params.id)
  if (!vehicle) {
    return (
      <div>
        <Back href="/fleet">← Fleet</Back>
        <h1 className="mt-4 text-2xl font-semibold">That vehicle is not on the books</h1>
      </div>
    )
  }
  const driver = byId(state.drivers, vehicle.driverId)
  const jobs = state.maintenance.filter((job) => job.vehicleId === vehicle.id)
  const loads = state.shipments.filter((shipment) => shipment.vehicleId === vehicle.id)
  const today = todayIso()

  return (
    <div>
      <Back href="/fleet">← Fleet</Back>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-mute">{vehicle.id}</p>
          <h1 className="mt-1 font-mono text-3xl tracking-tight">{vehicle.plate}</h1>
          <p className="mt-2 text-sm text-mute">{vehicle.make} · {vehicle.city} · {vehicle.heading}</p>
        </div>
        <div className="flex gap-2">
          <Pill value={vehicle.kind} />
          <Pill value={vehicle.status} />
        </div>
      </div>
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="card p-3 lg:col-span-3">
          <OpsMap
            points={[
              {
                id: vehicle.id,
                lat: vehicle.lat,
                lng: vehicle.lng,
                label: vehicle.plate,
                tone: vehicle.status === "maintenance" ? "warn" : "accent",
              },
            ]}
          />
        </div>
        <div className="card grid content-start gap-4 p-4 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-mute">Fuel</dt>
              <dd>{vehicle.fuelPct}%</dd>
            </div>
            <div>
              <dt className="text-mute">Odometer</dt>
              <dd>{num(vehicle.odometerKm)} km</dd>
            </div>
            <div>
              <dt className="text-mute">Capacity</dt>
              <dd>{vehicle.seats ? `${vehicle.seats} seats` : `${num(vehicle.capacityKg)} kg`}</dd>
            </div>
            <div>
              <dt className="text-mute">Updated</dt>
              <dd>{when(vehicle.updatedAt)}</dd>
            </div>
          </dl>
          <label className="grid gap-1 text-sm">
            Driver
            <select
              className="field"
              value={vehicle.driverId ?? ""}
              disabled={vehicle.status === "maintenance"}
              onChange={(event) => setError(assignDriver(vehicle.id, event.target.value || null))}
            >
              <option value="">Unassigned</option>
              {state.drivers.map((person) => (
                <option key={person.id} value={person.id} disabled={person.status === "leave"}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          {driver ? <p className="text-sm text-mute">{driver.phone} · {driver.license}</p> : <p className="text-sm text-mute">No driver on this vehicle.</p>}
          <button className="btn-ghost" disabled={vehicle.status === "maintenance"} onClick={() => setError(sendToWorkshop(vehicle.id))}>
            Send to workshop
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <p className="border-b border-line px-4 py-3 text-sm font-medium">Loads</p>
          {loads.length === 0 ? <p className="px-4 py-6 text-sm text-mute">No shipment is tied to this vehicle.</p> : (
            <ul>
              {loads.map((shipment) => (
                <li key={shipment.id} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
                  <Link href={`/shipments/${shipment.id}`} className="text-sm hover:underline">
                    {shipment.reference}
                    <span className="mt-1 block text-mute">{shipment.customer}</span>
                  </Link>
                  <Pill value={shipment.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <p className="border-b border-line px-4 py-3 text-sm font-medium">Service history</p>
          {jobs.length === 0 ? <p className="px-4 py-6 text-sm text-mute">No workshop jobs yet.</p> : (
            <ul>
              {jobs.map((job) => {
                const tone = jobTone(job.status, job.dueDate, today)
                return (
                  <li key={job.id} className="border-b border-line px-4 py-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{job.type}</p>
                      <Pill value={tone}>{tone === "overdue" ? "Overdue" : labelize(job.status)}</Pill>
                    </div>
                    <p className="mt-1 text-sm text-mute">{job.dueDate} · {job.workshop}</p>
                    {job.notes ? <p className="mt-1 text-sm">{job.notes}</p> : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
