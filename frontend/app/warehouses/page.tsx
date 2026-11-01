"use client"

import Link from "next/link"
import { PageIntro, Pill } from "@/components/ui"
import { num } from "@/lib/format"
import { available, byId } from "@/lib/logic"
import { useStore } from "@/lib/store"

export default function WarehousesPage() {
  const { state } = useStore()
  return (
    <div>
      <PageIntro
        kicker="Warehouses"
        title="Stock across three yards"
        text="Available is on-hand minus what open shipments already hold. Low lines are the ones sitting at reorder."
      />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {state.warehouses.map((warehouse) => {
          const rows = state.stock.filter((row) => row.warehouseId === warehouse.id)
          const onHand = rows.reduce((sum, row) => sum + row.onHand, 0)
          const pct = Math.min(100, Math.round((onHand / warehouse.capacityUnits) * 100))
          const low = rows.filter((row) => available(row) <= row.reorderAt).length
          return (
            <Link key={warehouse.id} href={`/warehouses/${warehouse.id}`} className="card p-4 hover:border-ink/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mute">{warehouse.code}</p>
                  <h2 className="mt-1 text-xl font-semibold">{warehouse.name}</h2>
                </div>
                {low ? <Pill value="delayed">{low} low</Pill> : <Pill value="idle">Healthy</Pill>}
              </div>
              <p className="mt-2 text-sm text-mute">{warehouse.address}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-sm text-mute">{pct}% of {num(warehouse.capacityUnits)} units · {warehouse.manager}</p>
            </Link>
          )
        })}
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-[#faf8f3]">
            <tr>
              <th>Item</th>
              <th>Yard</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {state.stock.map((row) => {
              const sku = byId(state.skus, row.skuId)
              const warehouse = byId(state.warehouses, row.warehouseId)
              const free = available(row)
              const low = free <= row.reorderAt
              return (
                <tr key={row.warehouseId + row.skuId} className="border-b border-line last:border-b-0">
                  <td>
                    {sku?.name}
                    <p className="text-xs text-mute">{sku?.category}</p>
                  </td>
                  <td>
                    <Link href={`/warehouses/${row.warehouseId}`} className="hover:underline">{warehouse?.name}</Link>
                  </td>
                  <td>{num(row.onHand)}</td>
                  <td>{num(row.reserved)}</td>
                  <td className={low ? "font-medium text-rose-700" : ""}>
                    {num(free)} {sku?.unit}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
