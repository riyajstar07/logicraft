"use client"

import { createContext, useContext, useEffect, useState } from "react"
import seed from "@/data/seed.json"
import {
  advanceShipment,
  adjustStock,
  assignDriver,
  assignShipment,
  bookTicket,
  cancelShipment,
  cancelTicket,
  clone,
  completeMaintenance,
  createShipment,
  scheduleMaintenance,
  sendToWorkshop,
  transferStock,
} from "./logic"
import type { ShipmentInput, State, TicketInput } from "./types"

const KEY = "logicraft-state-v1"
const seedState = seed as State

type Store = {
  ready: boolean
  state: State
  reset: () => void
  assignDriver: (vehicleId: string, driverId: string | null) => string | null
  scheduleMaintenance: (vehicleId: string, type: string, dueDate: string, notes: string) => string | null
  sendToWorkshop: (vehicleId: string) => string | null
  completeMaintenance: (id: string) => string | null
  adjustStock: (warehouseId: string, skuId: string, delta: number, reason: string) => string | null
  transferStock: (fromId: string, toId: string, skuId: string, qty: number) => string | null
  createShipment: (input: ShipmentInput) => { error: string | null; id: string | null }
  assignShipment: (id: string, vehicleId: string) => string | null
  advanceShipment: (id: string) => string | null
  cancelShipment: (id: string) => string | null
  bookTicket: (input: TicketInput) => { error: string | null; code: string | null }
  cancelTicket: (code: string) => string | null
}

const Ctx = createContext<Store | null>(null)

function storedState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version?: number; state?: State }
    if (parsed.version === 1 && parsed.state?.vehicles && parsed.state.shipments && parsed.state.tickets) {
      return parsed.state
    }
  } catch {
    return null
  }
  return null
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(() => clone(seedState))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = storedState()
    if (saved) setState(saved)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(KEY, JSON.stringify({ version: 1, state }))
  }, [ready, state])

  const apply = (result: { state: State; error: string | null }) => {
    if (!result.error) setState(result.state)
    return result.error
  }

  const value: Store = {
    ready,
    state,
    reset: () => setState(clone(seedState)),
    assignDriver: (vehicleId, driverId) => apply(assignDriver(state, vehicleId, driverId)),
    scheduleMaintenance: (vehicleId, type, dueDate, notes) =>
      apply(scheduleMaintenance(state, vehicleId, type, dueDate, notes)),
    sendToWorkshop: (vehicleId) => apply(sendToWorkshop(state, vehicleId)),
    completeMaintenance: (id) => apply(completeMaintenance(state, id)),
    adjustStock: (warehouseId, skuId, delta, reason) =>
      apply(adjustStock(state, warehouseId, skuId, delta, reason)),
    transferStock: (fromId, toId, skuId, qty) => apply(transferStock(state, fromId, toId, skuId, qty)),
    createShipment: (input) => {
      const result = createShipment(state, input)
      if (!result.error) setState(result.state)
      return { error: result.error, id: result.id }
    },
    assignShipment: (id, vehicleId) => apply(assignShipment(state, id, vehicleId)),
    advanceShipment: (id) => apply(advanceShipment(state, id)),
    cancelShipment: (id) => apply(cancelShipment(state, id)),
    bookTicket: (input) => {
      const result = bookTicket(state, input)
      if (!result.error) setState(result.state)
      return { error: result.error, code: result.code }
    },
    cancelTicket: (code) => apply(cancelTicket(state, code)),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("LogiCraft store is missing")
  return ctx
}
