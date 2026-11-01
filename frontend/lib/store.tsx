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

const seedState = seed as State

type Account = { email: string; name: string }

type Store = {
  ready: boolean
  state: State
  user: Account | null
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(() => clone(seedState))
  const [user, setUser] = useState<Account | null>(null)
  const [ready, setReady] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/network")
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = "/login"
          return
        }
        const body = (await response.json().catch(() => null)) as { state?: State; user?: Account; error?: string } | null
        if (!response.ok || !body?.state) {
          if (!cancelled) setProblem(body?.error ?? "The network could not be loaded")
          return
        }
        if (cancelled) return
        setState(body.state)
        setUser(body.user ?? null)
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setProblem("The network could not be loaded")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const persist = (next: State) => {
    void fetch("/api/network", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: next }),
    })
  }

  const apply = (result: { state: State; error: string | null }) => {
    if (!result.error) {
      setState(result.state)
      persist(result.state)
    }
    return result.error
  }

  const value: Store = {
    ready,
    state,
    user,
    reset: () => {
      const fresh = clone(seedState)
      setState(fresh)
      void fetch("/api/network/reset", { method: "POST" })
    },
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

  return (
    <Ctx.Provider value={value}>
      {problem ? <p className="p-8 text-sm text-rose-700">{problem}</p> : children}
    </Ctx.Provider>
  )
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("LogiCraft store is missing")
  return ctx
}
