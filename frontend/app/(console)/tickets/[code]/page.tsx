"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Back, ErrorNote, Pill } from "@/components/ui"
import { clock, inr, when } from "@/lib/format"
import { byId } from "@/lib/logic"
import { useStore } from "@/lib/store"

export default function TicketPage() {
  const params = useParams<{ code: string }>()
  const { state, cancelTicket } = useStore()
  const [error, setError] = useState<string | null>(null)
  const code = decodeURIComponent(params.code)
  const ticket = state.tickets.find((item) => item.code === code)

  if (!ticket) {
    return (
      <div>
        <Back href="/tickets">← Tickets</Back>
        <h1 className="mt-4 text-2xl font-semibold">No ticket under that code</h1>
      </div>
    )
  }

  const trip = byId(state.trips, ticket.tripId)
  const route = trip ? byId(state.routes, trip.routeId) : undefined
  const vehicle = trip ? byId(state.vehicles, trip.vehicleId) : undefined
  const driver = trip ? byId(state.drivers, trip.driverId) : undefined

  return (
    <div>
      <Back href="/tickets">← Tickets</Back>
      <article className="card mx-auto mt-6 grid max-w-3xl overflow-hidden md:grid-cols-[1fr_200px]">
        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-mute">LogiCraft transit</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight">{ticket.passenger}</h1>
          <p className="mt-2 text-sm text-mute">{ticket.phone}</p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-mute">From</p>
              <p className="text-lg font-medium">{ticket.fromStop}</p>
            </div>
            <div>
              <p className="text-mute">To</p>
              <p className="text-lg font-medium">{ticket.toStop}</p>
            </div>
            <div>
              <p className="text-mute">Service</p>
              <p>{route?.city} {route?.code} · {route?.name}</p>
              <p className="text-mute">{trip ? clock(trip.departTime) : ""}</p>
            </div>
            <div>
              <p className="text-mute">Coach</p>
              <p className="font-mono text-sm">{vehicle?.plate}</p>
              <p className="text-mute">{driver?.name}</p>
            </div>
            <div>
              <p className="text-mute">Seats</p>
              <p className="text-lg font-medium">{ticket.seats.join(", ")}</p>
            </div>
            <div>
              <p className="text-mute">Fare</p>
              <p className="text-lg font-medium">{inr(ticket.fareInr)}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Pill value={ticket.status} />
            <p className="text-xs text-mute">Issued {when(ticket.bookedAt)}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between border-t border-dashed border-line bg-[#faf8f3] p-6 md:border-l md:border-t-0">
          <Mark code={ticket.code} />
          <p className="font-mono text-sm">{ticket.code}</p>
        </div>
      </article>
      {error ? <div className="mx-auto mt-4 max-w-3xl"><ErrorNote>{error}</ErrorNote></div> : null}
      <div className="no-print mx-auto mt-4 flex max-w-3xl gap-2">
        <button className="btn-ghost" onClick={() => window.print()}>Print</button>
        {ticket.status === "confirmed" ? (
          <button className="btn" onClick={() => setError(cancelTicket(ticket.code))}>
            Cancel and free seats
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Mark({ code }: { code: string }) {
  let hash = 0
  for (const char of code) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  const cells = Array.from({ length: 121 }, (_, index) => ((hash >> (index % 24)) ^ (index * 17)) & 4)
  return (
    <div className="grid grid-cols-11 gap-0.5" aria-hidden="true">
      {cells.map((on, index) => (
        <span key={index} className={`h-2.5 w-2.5 ${on ? "bg-ink" : "bg-transparent"}`} />
      ))}
    </div>
  )
}
