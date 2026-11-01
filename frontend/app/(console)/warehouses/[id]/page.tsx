"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Back, ErrorNote } from "@/components/ui"
import { num, when } from "@/lib/format"
import { available, byId } from "@/lib/logic"
import { useStore } from "@/lib/store"

export default function WarehousePage() {
  const params = useParams<{ id: string }>()
  const { state, adjustStock, transferStock } = useStore()
  const warehouse = byId(state.warehouses, params.id)
  const [error, setError] = useState<string | null>(null)
  const rows = state.stock.filter((row) => row.warehouseId === params.id)
  const [skuId, setSkuId] = useState(rows[0]?.skuId ?? state.skus[0].id)
  const [delta, setDelta] = useState(5)
  const [reason, setReason] = useState("")
  const [dest, setDest] = useState(state.warehouses.find((item) => item.id !== params.id)?.id ?? "")
  const [qty, setQty] = useState(5)

  if (!warehouse) {
    return (
      <div>
        <Back href="/warehouses">← Warehouses</Back>
        <h1 className="mt-4 text-2xl font-semibold">That yard is not on the network</h1>
      </div>
    )
  }

  const movements = state.movements.filter((item) => item.warehouseId === warehouse.id).slice(0, 8)

  return (
    <div>
      <Back href="/warehouses">← Warehouses</Back>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.16em] text-mute">{warehouse.code} · {warehouse.city}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{warehouse.name}</h1>
        <p className="mt-2 text-sm text-mute">{warehouse.address} · {warehouse.manager}</p>
      </div>
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-[#faf8f3]">
              <tr>
                <th>Item</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sku = byId(state.skus, row.skuId)
                const free = available(row)
                return (
                  <tr key={row.skuId} className="border-b border-line last:border-b-0">
                    <td>
                      {sku?.name}
                      <p className="text-xs text-mute">{sku?.unit}</p>
                    </td>
                    <td>{num(row.onHand)}</td>
                    <td>{num(row.reserved)}</td>
                    <td className={free <= row.reorderAt ? "font-medium text-rose-700" : ""}>{num(free)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="grid content-start gap-4">
          <form
            className="card grid gap-3 p-4"
            onSubmit={(event) => {
              event.preventDefault()
              setError(adjustStock(warehouse.id, skuId, Number(delta), reason))
            }}
          >
            <p className="text-sm font-medium">Adjust on-hand</p>
            <select className="field" value={skuId} onChange={(event) => setSkuId(event.target.value)}>
              {state.skus.map((sku) => (
                <option key={sku.id} value={sku.id}>{sku.name}</option>
              ))}
            </select>
            <input className="field" type="number" value={delta} onChange={(event) => setDelta(Number(event.target.value))} aria-label="Quantity change" />
            <input className="field" placeholder="Why this count changed" value={reason} onChange={(event) => setReason(event.target.value)} />
            <button className="btn" type="submit">Update count</button>
          </form>
          <form
            className="card grid gap-3 p-4"
            onSubmit={(event) => {
              event.preventDefault()
              setError(transferStock(warehouse.id, dest, skuId, Number(qty)))
            }}
          >
            <p className="text-sm font-medium">Transfer out</p>
            <select className="field" value={dest} onChange={(event) => setDest(event.target.value)} aria-label="Destination warehouse">
              {state.warehouses.filter((item) => item.id !== warehouse.id).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input className="field" type="number" min={1} value={qty} onChange={(event) => setQty(Number(event.target.value))} aria-label="Transfer quantity" />
            <button className="btn-ghost" type="submit">Move stock</button>
          </form>
        </div>
      </div>
      <section className="card mt-4">
        <p className="border-b border-line px-4 py-3 text-sm font-medium">Ledger</p>
        <ul>
          {movements.map((item) => {
            const sku = byId(state.skus, item.skuId)
            return (
              <li key={item.id} className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
                <div>
                  <p className="text-sm">{item.reason}</p>
                  <p className="text-xs text-mute">{sku?.name} · {when(item.at)}</p>
                </div>
                <p className="font-mono text-sm">{item.delta > 0 ? "+" : ""}{item.delta}</p>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
