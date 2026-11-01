import Link from "next/link"
import { SiteFooter } from "@/components/SiteFooter"

const MODULES = [
  { name: "Fleet", text: "Vehicles, drivers, assignments, and the workshop." },
  { name: "Warehouses", text: "On-hand, reserved, and available stock across three yards." },
  { name: "Shipments", text: "Reserve stock, assign a truck, and close the delivery." },
  { name: "Transit", text: "Coach schedules, a seat map, and digital tickets." },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-serif text-xl tracking-tight">LogiCraft</span>
        </div>
        <Link href="/login" className="btn">
          Sign in
        </Link>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 md:px-8 md:pt-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">Mumbai · Delhi · Bengaluru · Pune</p>
        <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
          Freight, yards, and city coaches on one board.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-mute">
          LogiCraft runs fleet tracking, warehouse stock, shipment control, and public-transport ticketing as one operations console.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="btn-accent">
            Open the console
          </Link>
          <a href="https://riyajaiswal.com" className="btn-ghost">
            Riya Jaiswal
          </a>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((item) => (
            <article key={item.name} className="card p-5">
              <h2 className="font-serif text-2xl">{item.name}</h2>
              <p className="mt-2 text-sm leading-6 text-mute">{item.text}</p>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect width="22" height="22" rx="6" fill="#0f6e56" />
      <path d="M4.5 15.5h13M6 15.5V8.5l5 3.6 5-3.6v7" fill="none" stroke="white" strokeWidth="1.4" />
    </svg>
  )
}
