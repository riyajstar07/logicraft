"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ErrorNote, PageIntro, Pill } from "@/components/ui"
import { cx, labelize } from "@/lib/format"
import { DESTINATIONS, available, byId } from "@/lib/logic"
import { useStore } from "@/lib/store"
import type { Priority } from "@/lib/types"

const FILTERS = ["all", "reserved", "assigned", "picked-up", "in-transit", "delivered", "cancelled"] as const

export default function ShipmentsPage() {
  const { state, createShipment } = useStore()
  const router = useRouter()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all")
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customer, setCustomer] = useState("")
  const [originId, setOriginId] = useState(state.warehouses[0].id)
  const [destIndex, setDestIndex] = useState(0)
  const [address, setAddress] = useState(DESTINATIONS[0].address)
  const [priority, setPriority] = useState<Priority>("standard")
  const [skuId, setSkuId] = useState(state.skus[0].id)
  const [qty, setQty] = useState(4)

  const rows = state.shipments.filter((shipment) => filter === "all" || shipment.status === filter)
  const dest = DESTINATIONS[destIndex]
  const origin = byId(state.warehouses, originId)
  const sku = byId(state.skus, skuId)
  const row = state.stock.find((item) => item.warehouseId === originId && item.skuId === skuId)

  return (
    <div>
      <PageIntro
        kicker="Shipments"
        title="From reservation to proof of delivery"
        text="Creating a shipment holds stock. Assign a free freight vehicle, then walk it through pickup, transit, and delivery."
        action={<button className="btn" onClick={() => setOpen((value) => !value)}>{open ? "Close form" : "New shipment"}</button>}
      />
      {open ? (
        <form
          className="card mt-4 grid gap-3 p-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            const result = createShipment({
              customer,
              originId,
              destinationCity: dest.city,
              destinationAddress: address,
              destLat: dest.lat,
              destLng: dest.lng,
              priority,
              lines: [{ skuId, qty: Number(qty) }],
            })
            setError(result.error)
            if (result.id) router.push(`/shipments/${result.id}`)
          }}
        >
          <label className="grid gap-1 text-sm">
            Customer
            <input className="field" value={customer} onChange={(event) => setCustomer(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm">
            Origin
            <select className="field" value={originId} onChange={(event) => setOriginId(event.target.value)}>
              {state.warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Destination
            <select
              className="field"
              value={destIndex}
              onChange={(event) => {
                const index = Number(event.target.value)
                setDestIndex(index)
                setAddress(DESTINATIONS[index].address)
              }}
            >
              {DESTINATIONS.map((item, index) => (
                <option key={item.city} value={index}>{item.city}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Address
            <input className="field" value={address} onChange={(event) => setAddress(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Item
            <select className="field" value={skuId} onChange={(event) => setSkuId(event.target.value)}>
              {state.skus.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Quantity
            <input className="field" type="number" min={1} value={qty} onChange={(event) => setQty(Number(event.target.value))} />
          </label>
          <label className="grid gap-1 text-sm">
            Priority
            <select className="field" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
              <option value="standard">Standard</option>
              <option value="express">Express</option>
            </select>
          </label>
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm text-mute">
              {row && sku && origin ? `${available(row)} ${sku.unit} available at ${origin.name}` : "No stock row at this yard"}
            </p>
            <button className="btn-accent" type="submit">Reserve stock</button>
          </div>
          {error ? <div className="md:col-span-2"><ErrorNote>{error}</ErrorNote></div> : null}
        </form>
      ) : null}
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((item) => (
          <button
            key={item}
            className={cx("whitespace-nowrap rounded-full px-3 py-1.5 text-sm", filter === item ? "bg-ink text-white" : "bg-white")}
            onClick={() => setFilter(item)}
          >
            {item === "all" ? "All" : labelize(item)}
          </button>
        ))}
      </div>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-[#faf8f3]">
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Lane</th>
              <th>Status</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((shipment) => {
              const warehouse = byId(state.warehouses, shipment.originId)
              return (
                <tr key={shipment.id} className="border-b border-line last:border-b-0">
                  <td>
                    <Link href={`/shipments/${shipment.id}`} className="font-mono text-[13px] hover:underline">
                      {shipment.reference}
                    </Link>
                  </td>
                  <td>{shipment.customer}</td>
                  <td>{warehouse?.code} → {shipment.destinationCity}</td>
                  <td>
                    <div className="flex gap-2">
                      <Pill value={shipment.status} />
                      {shipment.delayed && !["delivered", "cancelled"].includes(shipment.status) ? <Pill value="delayed">Delayed</Pill> : null}
                    </div>
                  </td>
                  <td><Pill value={shipment.priority} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
