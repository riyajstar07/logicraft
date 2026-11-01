import { ResetDemo } from "@/components/ResetDemo"
import { PageIntro } from "@/components/ui"

const MODULES = [
  {
    name: "Fleet",
    text: "Vehicles, driver profiles, assignment, and maintenance scheduling. A vehicle in the workshop cannot take a load.",
  },
  {
    name: "Warehouse",
    text: "Three yards, on-hand and reserved quantities, adjustments, and transfers. Available stock is what a new shipment can hold.",
  },
  {
    name: "Shipments",
    text: "Create, reserve, assign, pick up, transit, deliver, or cancel. Delivery consumes the reservation. Cancellation before pickup releases it.",
  },
  {
    name: "Transit",
    text: "Routes, timed services, a 40-seat coach map, fares by hop, and digital tickets. Cancelling a ticket frees the seats.",
  },
]

export default function SystemPage() {
  return (
    <div>
      <PageIntro
        kicker="System"
        title="One set of operating rules"
        text="LogiCraft is a logistics console for linehaul freight and city coaches. The screens you just used are the same rules the Python service enforces."
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {MODULES.map((item) => (
          <article key={item.name} className="card p-5">
            <h2 className="font-serif text-2xl">{item.name}</h2>
            <p className="mt-2 text-sm leading-6 text-mute">{item.text}</p>
          </article>
        ))}
      </div>
      <div className="card mt-4 p-5 text-sm leading-6">
        <p>
          The live console keeps the network in this browser, so reserving stock, advancing a shipment, and issuing a ticket all stay available on the deployed site. The FastAPI service in <span className="font-mono">backend/</span> stores the same document in SQLite and exposes it at <span className="font-mono">/api</span> and <span className="font-mono">/docs</span>.
        </p>
        <p className="mt-3">
          Domain logic sits in <span className="font-mono">backend/app/domain.py</span>. The end-to-end test walks a shipment from an oversell rejection through delivery, then books and cancels a seat.
        </p>
        <p className="mt-3 text-mute">
          Built by Riya Jaiswal · <a className="underline" href="https://riyajaiswal.com">riyajaiswal.com</a> · riyajstar07@gmail.com
        </p>
        <ResetDemo />
      </div>
    </div>
  )
}
