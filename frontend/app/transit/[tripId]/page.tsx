"use client"

import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Back, ErrorNote, Pill } from "@/components/ui"
import { clock, cx, inr } from "@/lib/format"
import { bookedSeats, byId, quoteFare, serviceWindow } from "@/lib/logic"
import { useStore } from "@/lib/store"

export default function BookPage() {
  const params = useParams<{ tripId: string }>()
  const router = useRouter()
  const { state, bookTicket } = useStore()
  const trip = byId(state.trips, params.tripId)
  const route = trip ? byId(state.routes, trip.routeId) : undefined
  const [fromStop, setFromStop] = useState(route?.stops[0]?.name ?? "")
  const [toStop, setToStop] = useState(route?.stops[route.stops.length - 1]?.name ?? "")
  const [selected, setSelected] = useState<number[]>([])
  const [passenger, setPassenger] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState<string | null>(null)

  const taken = useMemo(() => (trip ? bookedSeats(state, trip.id) : new Set<number>()), [state, trip])

  if (!trip || !route) {
    return (
      <div>
        <Back href="/transit">← Transit</Back>
        <h1 className="mt-4 text-2xl font-semibold">That service is not running</h1>
      </div>
    )
  }

  const vehicle = byId(state.vehicles, trip.vehicleId)
  const driver = byId(state.drivers, trip.driverId)
  const phase = serviceWindow(trip.departTime, trip.durationMin)
  const fare = quoteFare(route, fromStop, toStop, selected.length)

  return (
    <div>
      <Back href="/transit">← Transit</Back>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-mute">{route.city} · route {route.code}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{route.name}</h1>
          <p className="mt-2 text-sm text-mute">
            Departs {clock(trip.departTime)} · {vehicle?.plate} · {driver?.name}
          </p>
        </div>
        <Pill value={phase.phase} />
      </div>
      <form
        className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]"
        onSubmit={(event) => {
          event.preventDefault()
          const result = bookTicket({
            tripId: trip.id,
            passenger,
            phone,
            fromStop,
            toStop,
            seats: selected,
          })
          setError(result.error)
          if (result.code) router.push(`/tickets/${result.code}`)
        }}
      >
        <div className="card p-4">
          <div className="mb-4 flex items-center justify-between text-sm text-mute">
            <span>Front of coach</span>
            <span>{40 - taken.size} open</span>
          </div>
          <div className="mx-auto grid max-w-sm gap-2">
            {Array.from({ length: 10 }, (_, row) => (
              <div key={row} className="grid grid-cols-[1fr_1fr_20px_1fr_1fr] gap-2">
                {[0, 1].map((column) => {
                  const seat = row * 4 + column + 1
                  return (
                    <Seat
                      key={seat}
                      seat={seat}
                      taken={taken.has(seat)}
                      on={selected.includes(seat)}
                      onToggle={() =>
                        setSelected((current) =>
                          current.includes(seat) ? current.filter((item) => item !== seat) : [...current, seat],
                        )
                      }
                    />
                  )
                })}
                <span />
                {[2, 3].map((column) => {
                  const seat = row * 4 + column + 1
                  return (
                    <Seat
                      key={seat}
                      seat={seat}
                      taken={taken.has(seat)}
                      on={selected.includes(seat)}
                      onToggle={() =>
                        setSelected((current) =>
                          current.includes(seat) ? current.filter((item) => item !== seat) : [...current, seat],
                        )
                      }
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-mute">
            <span>Open seats are white</span>
            <span>Yours are green</span>
            <span>Taken seats stay grey</span>
          </div>
        </div>
        <div className="card grid content-start gap-3 p-4">
          <label className="grid gap-1 text-sm">
            From
            <select className="field" value={fromStop} onChange={(event) => setFromStop(event.target.value)}>
              {route.stops.map((stop) => (
                <option key={stop.name}>{stop.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            To
            <select className="field" value={toStop} onChange={(event) => setToStop(event.target.value)}>
              {route.stops.map((stop) => (
                <option key={stop.name}>{stop.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Passenger
            <input className="field" value={passenger} onChange={(event) => setPassenger(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm">
            Phone
            <input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </label>
          <p className="text-sm">
            {selected.length ? `Seats ${selected.slice().sort((a, b) => a - b).join(", ")}` : "Select up to 6 seats"}
          </p>
          <p className="text-2xl font-semibold">{inr(fare)}</p>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <button className="btn-accent" type="submit" disabled={selected.length === 0}>
            Issue ticket
          </button>
        </div>
      </form>
    </div>
  )
}

function Seat({
  seat,
  taken,
  on,
  onToggle,
}: {
  seat: number
  taken: boolean
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      disabled={taken}
      onClick={onToggle}
      className={cx(
        "h-10 rounded-lg border text-sm",
        taken && "cursor-not-allowed border-transparent bg-stone-200 text-stone-400",
        !taken && !on && "border-line bg-white",
        on && "border-accent bg-accent text-white",
      )}
      aria-label={`Seat ${seat}${taken ? " taken" : ""}`}
    >
      {seat}
    </button>
  )
}
