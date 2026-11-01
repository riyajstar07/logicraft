"use client"

import Link from "next/link"
import { OpsMap, PageIntro, Pill } from "@/components/ui"
import { clock } from "@/lib/format"
import { bookedSeats, byId, pointAlong, serviceWindow } from "@/lib/logic"
import { useStore } from "@/lib/store"

export default function TransitPage() {
  const { state } = useStore()
  const now = new Date()
  const services = state.trips.map((trip) => {
    const route = byId(state.routes, trip.routeId)!
    const window = serviceWindow(trip.departTime, trip.durationMin, now)
    const spot = pointAlong(route.stops, window.phase === "live" ? window.progress : window.phase === "completed" ? 1 : 0)
    return { trip, route, window, spot }
  })
  const points = services.flatMap((service) => [
    ...service.route.stops.map((stop) => ({
      id: `${service.route.id}-${stop.name}`,
      lat: stop.lat,
      lng: stop.lng,
      label: stop.name,
      tone: "warehouse" as const,
    })),
    {
      id: service.trip.id,
      lat: service.spot.lat,
      lng: service.spot.lng,
      label: service.route.code,
      tone: service.window.phase === "live" ? ("accent" as const) : ("ink" as const),
    },
  ])

  return (
    <div>
      <PageIntro
        kicker="Transit"
        title="City coaches, seats, and tickets"
        text="Four corridors run today. Pick a service, choose seats, and the ticket is issued on the spot."
      />
      <div className="card mt-6 p-3">
        <OpsMap points={points} className="min-h-[360px]" />
      </div>
      <div className="mt-4 grid gap-3">
        {services.map(({ trip, route, window }) => {
          const vehicle = byId(state.vehicles, trip.vehicleId)
          const driver = byId(state.drivers, trip.driverId)
          const taken = bookedSeats(state, trip.id).size
          return (
            <article key={trip.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-mute">{route.city} · route {route.code}</p>
                <h2 className="mt-1 text-xl font-semibold">{route.name}</h2>
                <p className="mt-1 text-sm text-mute">
                  {route.stops.map((stop) => stop.name).join(" → ")}
                </p>
                <p className="mt-2 text-sm">
                  {clock(trip.departTime)} · {vehicle?.plate} · {driver?.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Pill value={window.phase} />
                  <p className="mt-2 text-sm text-mute">{40 - taken} seats open</p>
                </div>
                <Link href={`/transit/${trip.id}`} className="btn">
                  Book
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
