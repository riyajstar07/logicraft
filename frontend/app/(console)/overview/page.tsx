"use client"

import Link from "next/link"
import { OpsMap, PageIntro, Pill, Stat } from "@/components/ui"
import { labelize, num, when } from "@/lib/format"
import { available, byId, jobTone, todayIso } from "@/lib/logic"
import { useStore } from "@/lib/store"

export default function OverviewPage() {
  const { state } = useStore()
  const today = todayIso()
  const active = state.vehicles.filter((vehicle) => vehicle.status === "en-route" || vehicle.status === "loading")
  const open = state.shipments.filter((shipment) => !["delivered", "cancelled"].includes(shipment.status))
  const delayed = open.filter((shipment) => shipment.delayed)
  const low = state.stock.filter((row) => available(row) <= row.reorderAt)
  const overdue = state.maintenance.filter((job) => jobTone(job.status, job.dueDate, today) === "overdue")
  const tickets = state.tickets.filter((ticket) => ticket.status === "confirmed")
  const feed = state.shipments
    .flatMap((shipment) =>
      shipment.events.map((event) => ({
        at: event.at,
        title: `${shipment.reference} · ${event.label}`,
        detail: event.detail,
        href: `/shipments/${shipment.id}`,
      })),
    )
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6)

  const points = [
    ...state.warehouses.map((warehouse) => ({
      id: warehouse.id,
      lat: warehouse.lat,
      lng: warehouse.lng,
      label: warehouse.city,
      tone: "warehouse" as const,
    })),
    ...state.vehicles
      .filter((vehicle) => vehicle.kind !== "coach")
      .map((vehicle) => ({
        id: vehicle.id,
        lat: vehicle.lat,
        lng: vehicle.lng,
        label: vehicle.city,
        tone: vehicle.status === "maintenance" ? ("warn" as const) : ("accent" as const),
      })),
  ]

  return (
    <div>
      <PageIntro
        kicker="Mumbai · Delhi · Bengaluru"
        title="The network this afternoon"
        text="Freight, stock, and city coaches on one board. What you change here is saved to the account you signed in with."
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Moving now" value={active.length} hint={`${state.vehicles.length} vehicles on the books`} />
        <Stat label="Open shipments" value={open.length} hint={delayed.length ? `${delayed.length} running late` : "None delayed"} />
        <Stat label="Low stock lines" value={low.length} hint="At or under reorder" />
        <Stat label="Live tickets" value={tickets.length} hint={`${overdue.length} service jobs overdue`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="card p-3 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-sm font-medium">Linehaul</p>
            <p className="text-xs text-mute">Yards and freight vehicles</p>
          </div>
          <OpsMap points={points} />
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-1 text-xs text-mute">
            {Array.from(new Set(points.map((point) => point.label))).map((city) => (
              <span key={city}>{city}</span>
            ))}
          </div>
        </div>
        <div className="card lg:col-span-2">
          <p className="border-b border-line px-4 py-3 text-sm font-medium">Latest movement</p>
          <ul>
            {feed.map((item) => (
              <li key={item.title + item.at} className="border-b border-line px-4 py-3 last:border-b-0">
                <Link href={item.href} className="text-sm font-medium hover:underline">
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-mute">{item.detail}</p>
                <p className="mt-1 text-xs text-mute">{when(item.at)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium">Reorder now</p>
            <Link href="/warehouses" className="text-sm text-mute hover:text-ink">
              Warehouses
            </Link>
          </div>
          <ul>
            {low.map((row) => {
              const sku = byId(state.skus, row.skuId)
              const warehouse = byId(state.warehouses, row.warehouseId)
              return (
                <li key={row.warehouseId + row.skuId} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{sku?.name}</p>
                    <p className="text-sm text-mute">{warehouse?.name}</p>
                  </div>
                  <p className="text-sm">
                    {num(available(row))} {sku?.unit}
                    <span className="text-mute"> / {row.reorderAt}</span>
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="card">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium">Workshop</p>
            <Link href="/fleet" className="text-sm text-mute hover:text-ink">
              Fleet
            </Link>
          </div>
          <ul>
            {state.maintenance
              .filter((job) => job.status !== "done")
              .map((job) => {
                const vehicle = byId(state.vehicles, job.vehicleId)
                const tone = jobTone(job.status, job.dueDate, today)
                return (
                  <li key={job.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{job.type}</p>
                      <p className="font-mono text-xs text-mute">{vehicle?.plate}</p>
                    </div>
                    <Pill value={tone}>{tone === "overdue" ? "Overdue" : labelize(tone)}</Pill>
                  </li>
                )
              })}
          </ul>
        </div>
      </div>
    </div>
  )
}
