"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Bus, LayoutDashboard, Network, Package, Search, Ticket, Truck, Warehouse } from "lucide-react"
import { useStore } from "@/lib/store"
import { cx } from "@/lib/format"

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/fleet", label: "Fleet", icon: Truck },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse },
  { href: "/shipments", label: "Shipments", icon: Package },
  { href: "/transit", label: "Transit", icon: Bus },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/system", label: "System", icon: Network },
]

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { state, ready, reset } = useStore()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery("")
    setOpen(false)
  }, [pathname])

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const items: { href: string; label: string; hint: string }[] = []
    for (const vehicle of state.vehicles) {
      if (`${vehicle.plate} ${vehicle.id} ${vehicle.city} ${vehicle.make}`.toLowerCase().includes(q)) {
        items.push({ href: `/fleet/${vehicle.id}`, label: vehicle.plate, hint: vehicle.city })
      }
    }
    for (const shipment of state.shipments) {
      if (`${shipment.reference} ${shipment.customer} ${shipment.destinationCity}`.toLowerCase().includes(q)) {
        items.push({ href: `/shipments/${shipment.id}`, label: shipment.reference, hint: shipment.customer })
      }
    }
    for (const ticket of state.tickets) {
      if (`${ticket.code} ${ticket.passenger}`.toLowerCase().includes(q)) {
        items.push({ href: `/tickets/${ticket.code}`, label: ticket.code, hint: ticket.passenger })
      }
    }
    for (const driver of state.drivers) {
      if (driver.name.toLowerCase().includes(q)) {
        const vehicle = state.vehicles.find((item) => item.driverId === driver.id)
        items.push({
          href: vehicle ? `/fleet/${vehicle.id}` : "/fleet",
          label: driver.name,
          hint: driver.hub,
        })
      }
    }
    return items.slice(0, 8)
  }, [query, state])

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="hidden bg-side text-[#ece8df] md:flex md:min-h-screen md:flex-col md:justify-between md:px-4 md:py-5">
        <div>
          <Link href="/" className="flex items-center gap-2.5 px-2">
            <Mark />
            <span className="font-serif text-xl tracking-tight">LogiCraft</span>
          </Link>
          <nav className="mt-8 grid gap-1">
            {NAV.map((item) => {
              const Icon = item.icon
              const on = active(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
                    on ? "bg-white/10 text-white" : "text-[#c9c4b8] hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="px-2 text-xs leading-5 text-[#a39e92]">
          <p className="text-[#ece8df]">Riya Jaiswal</p>
          <a className="hover:text-white" href="https://riyajaiswal.com">
            riyajaiswal.com
          </a>
          <button
            className="mt-3 block text-left text-[#c9c4b8] underline-offset-4 hover:underline"
            onClick={() => {
              if (window.confirm("Reset the demo back to this morning's network?")) reset()
            }}
          >
            Reset demo data
          </button>
        </div>
      </aside>
      <div>
        <header className="sticky top-0 z-30 border-b border-line bg-[#f3f1ea]/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-8">
            <Link href="/" className="flex items-center gap-2 md:hidden">
              <Mark />
              <span className="font-serif text-lg">LogiCraft</span>
            </Link>
            <div className="relative ml-auto w-full max-w-md">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                placeholder="Plate, shipment, ticket, driver"
                className="field !pl-9"
                aria-label="Search the network"
              />
              {open && hits.length > 0 ? (
                <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
                  {hits.map((hit) => (
                    <button
                      key={hit.href + hit.label}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#faf8f3]"
                      onClick={() => router.push(hit.href)}
                    >
                      <span>{hit.label}</span>
                      <span className="text-mute">{hit.hint}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <span className="hidden items-center gap-2 text-sm text-mute sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Network live
            </span>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm",
                  active(pathname, item.href) ? "bg-ink text-white" : "bg-white text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {ready ? children : <p className="text-sm text-mute">Loading the network…</p>}
        </main>
      </div>
    </div>
  )
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect width="22" height="22" rx="6" fill="#0f6e56" />
      <path d="M4.5 15.5h13M6 15.5V8.5l5 3.6 5-3.6v7" fill="none" stroke="white" strokeWidth="1.4" />
    </svg>
  )
}
