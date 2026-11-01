import Link from "next/link"
import { SiteFooter } from "@/components/SiteFooter"

const FACTS = [
  { value: "10", label: "vehicles on the board" },
  { value: "3", label: "yards holding stock" },
  { value: "4", label: "city coach routes" },
  { value: "1", label: "account, one network" },
]

const FEATURES = [
  {
    name: "Fleet",
    title: "See who is actually driving.",
    text: "Assign a driver, send a vehicle to the workshop, and tell a moving truck from one that is waiting in the yard.",
  },
  {
    name: "Warehouses",
    title: "Keep a hold on the stock.",
    text: "On-hand, reserved, and available stay separate, so a new shipment cannot take goods another order already claimed.",
  },
  {
    name: "Shipments",
    title: "Walk a load to the door.",
    text: "Reserve the goods, put a driver on the lane, then mark pickup, transit, and delivery without losing the count.",
  },
  {
    name: "Transit",
    title: "Sell the seat, then the ticket.",
    text: "Pick a coach and a pair of stops, choose up to six seats, and cancel the pass if the passenger does not travel.",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo />
          <span className="truncate font-serif text-lg tracking-tight sm:text-xl">LogiCraft</span>
        </div>
        <Link href="/login" className="btn shrink-0">
          Sign in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6 lg:px-8">
        <section className="pt-8 sm:pt-14 lg:pt-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">For dispatch, the yard, and the route</p>
          <h1 className="mt-4 max-w-3xl font-serif text-[2.35rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            See the fleet, the stock, and the ticket in one place.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-mute sm:text-lg">
            LogiCraft is the operations console for a shift that has to know which truck is moving, which yard is short, and which coach still has a seat.
          </p>
          <div className="mt-8">
            <Link href="/login" className="btn-accent w-full sm:w-auto">
              Open the console
            </Link>
          </div>
        </section>

        <section className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:mt-16 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="bg-panel px-4 py-5 sm:px-5">
              <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{fact.value}</p>
              <p className="mt-1 text-sm leading-5 text-mute">{fact.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="max-w-xl font-serif text-3xl tracking-tight sm:text-4xl">Four jobs. One board.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-mute sm:text-base">
            The same rules run from the first reservation to the last seat. Nothing is a separate app.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <article key={feature.name} className="card p-5 sm:p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">{feature.name}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-mute sm:text-base">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card mt-16 flex flex-col gap-6 p-6 sm:mt-20 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">This morning&apos;s network is already on the board.</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-mute sm:text-base">
              Sign in, work the shift, and the account keeps the vehicles, stock, shipments, and tickets.
            </p>
          </div>
          <Link href="/login" className="btn-accent w-full shrink-0 sm:w-auto">
            Open the console
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <rect width="22" height="22" rx="6" fill="#0f6e56" />
      <path d="M4.5 15.5h13M6 15.5V8.5l5 3.6 5-3.6v7" fill="none" stroke="white" strokeWidth="1.4" />
    </svg>
  )
}
