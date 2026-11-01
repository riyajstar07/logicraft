"use client"

import Link from "next/link"
import { useState } from "react"
import { ErrorNote, PageIntro, Pill } from "@/components/ui"
import { cx, labelize } from "@/lib/format"
import { SERVICE_TYPES, byId, jobTone, todayIso } from "@/lib/logic"
import { useStore } from "@/lib/store"

const TABS = ["Vehicles", "Drivers", "Maintenance"] as const

export default function FleetPage() {
  const { state, assignDriver, scheduleMaintenance, completeMaintenance } = useStore()
  const [tab, setTab] = useState<(typeof TABS)[number]>("Vehicles")
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState("Oil service")
  const [vehicleId, setVehicleId] = useState(state.vehicles[0]?.id ?? "")
  const [dueDate, setDueDate] = useState(todayIso())
  const [notes, setNotes] = useState("")
  const today = todayIso()

  return (
    <div>
      <PageIntro
        kicker="Fleet"
        title="Vehicles, drivers, and the workshop"
        text="Assign a driver, call a vehicle in, or close a service job. Coaches stay on the transit board."
      />
      <div className="mt-6 flex gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            className={cx("rounded-full px-3 py-1.5 text-sm", tab === item ? "bg-ink text-white" : "bg-white text-ink")}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}

      {tab === "Vehicles" ? (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-[#faf8f3]">
              <tr>
                <th>Plate</th>
                <th>Type</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Where</th>
                <th>Fuel</th>
              </tr>
            </thead>
            <tbody>
              {state.vehicles.map((vehicle) => {
                const driver = byId(state.drivers, vehicle.driverId)
                return (
                  <tr key={vehicle.id} className="border-b border-line last:border-b-0">
                    <td>
                      <Link href={`/fleet/${vehicle.id}`} className="font-mono text-[13px] hover:underline">
                        {vehicle.plate}
                      </Link>
                      <p className="text-xs text-mute">{vehicle.make}</p>
                    </td>
                    <td><Pill value={vehicle.kind} /></td>
                    <td><Pill value={vehicle.status} /></td>
                    <td>
                      <select
                        className="field max-w-[180px]"
                        value={vehicle.driverId ?? ""}
                        disabled={vehicle.status === "maintenance"}
                        onChange={(event) => {
                          const message = assignDriver(vehicle.id, event.target.value || null)
                          setError(message)
                        }}
                        aria-label={`Driver for ${vehicle.plate}`}
                      >
                        <option value="">Unassigned</option>
                        {state.drivers.map((person) => (
                          <option key={person.id} value={person.id} disabled={person.status === "leave"}>
                            {person.name}{person.status === "leave" ? " · leave" : ""}
                          </option>
                        ))}
                      </select>
                      {driver ? <p className="mt-1 text-xs text-mute">{driver.hub}</p> : null}
                    </td>
                    <td>
                      {vehicle.city}
                      <p className="text-xs text-mute">{vehicle.heading}</p>
                    </td>
                    <td>{vehicle.fuelPct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "Drivers" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {state.drivers.map((driver) => {
            const vehicle = state.vehicles.find((item) => item.driverId === driver.id)
            return (
              <div key={driver.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{driver.name}</p>
                    <p className="mt-1 text-sm text-mute">{driver.hub} · {driver.phone}</p>
                  </div>
                  <Pill value={driver.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-mute">License</dt>
                    <dd className="font-mono text-xs">{driver.license}</dd>
                  </div>
                  <div>
                    <dt className="text-mute">Today</dt>
                    <dd>{driver.hoursToday} h · {driver.rating.toFixed(1)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-mute">Vehicle</dt>
                    <dd>
                      {vehicle ? (
                        <Link className="font-mono text-xs hover:underline" href={`/fleet/${vehicle.id}`}>
                          {vehicle.plate}
                        </Link>
                      ) : (
                        "Not assigned"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )
          })}
        </div>
      ) : null}

      {tab === "Maintenance" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <form
            className="card grid gap-3 p-4"
            onSubmit={(event) => {
              event.preventDefault()
              const message = scheduleMaintenance(vehicleId, kind, dueDate, notes)
              setError(message)
              if (!message) setNotes("")
            }}
          >
            <p className="text-sm font-medium">Schedule service</p>
            <label className="grid gap-1 text-sm">
              Vehicle
              <select className="field" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
                {state.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Job
              <select className="field" value={kind} onChange={(event) => setKind(event.target.value)}>
                {SERVICE_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Due
              <input className="field" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
            </label>
            <label className="grid gap-1 text-sm">
              Notes
              <textarea className="field min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <button className="btn" type="submit">Save job</button>
            <p className="text-xs leading-5 text-mute">A due date of today pulls the vehicle into the workshop and releases its driver.</p>
          </form>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-[#faf8f3]">
                <tr>
                  <th>Job</th>
                  <th>Vehicle</th>
                  <th>Due</th>
                  <th>State</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.maintenance.map((job) => {
                  const vehicle = byId(state.vehicles, job.vehicleId)
                  const tone = jobTone(job.status, job.dueDate, today)
                  return (
                    <tr key={job.id} className="border-b border-line last:border-b-0">
                      <td>
                        {job.type}
                        <p className="text-xs text-mute">{job.workshop}</p>
                      </td>
                      <td className="font-mono text-xs">{vehicle?.plate}</td>
                      <td>{job.dueDate}</td>
                      <td><Pill value={tone}>{tone === "overdue" ? "Overdue" : labelize(job.status)}</Pill></td>
                      <td>
                        {job.status !== "done" ? (
                          <button
                            className="btn-quiet"
                            onClick={() => setError(completeMaintenance(job.id))}
                          >
                            Mark done
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
