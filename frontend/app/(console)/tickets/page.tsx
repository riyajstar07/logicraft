"use client"

import Link from "next/link"
import { PageIntro, Pill } from "@/components/ui"
import { inr, when } from "@/lib/format"
import { byId } from "@/lib/logic"
import { useStore } from "@/lib/store"

export default function TicketsPage() {
  const { state } = useStore()
  return (
    <div>
      <PageIntro
        kicker="Tickets"
        title="Issued boarding passes"
        text="Every confirmed booking holds its seats until you cancel it."
      />
      <div className="mt-6 grid gap-3">
        {state.tickets.map((ticket) => {
          const trip = byId(state.trips, ticket.tripId)
          const route = trip ? byId(state.routes, trip.routeId) : undefined
          return (
            <Link key={ticket.code} href={`/tickets/${ticket.code}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-ink/20">
              <div>
                <p className="font-mono text-sm">{ticket.code}</p>
                <p className="mt-1 font-medium">{ticket.passenger}</p>
                <p className="text-sm text-mute">
                  {route?.city} route {route?.code} · {ticket.fromStop} → {ticket.toStop}
                </p>
              </div>
              <div className="text-right">
                <Pill value={ticket.status} />
                <p className="mt-2 text-sm">{inr(ticket.fareInr)} · seats {ticket.seats.join(", ")}</p>
                <p className="text-xs text-mute">{when(ticket.bookedAt)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
