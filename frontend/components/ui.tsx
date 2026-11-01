import Link from "next/link"
import { labelize, cx } from "@/lib/format"

const TONES: Record<string, string> = {
  "en-route": "bg-emerald-50 text-emerald-800",
  live: "bg-emerald-50 text-emerald-800",
  idle: "bg-stone-100 text-stone-600",
  loading: "bg-amber-50 text-amber-800",
  maintenance: "bg-rose-50 text-rose-800",
  overdue: "bg-rose-50 text-rose-800",
  reserved: "bg-sky-50 text-sky-800",
  assigned: "bg-indigo-50 text-indigo-800",
  "picked-up": "bg-amber-50 text-amber-800",
  "in-transit": "bg-emerald-50 text-emerald-800",
  delivered: "bg-stone-100 text-stone-600",
  cancelled: "bg-rose-50 text-rose-700",
  "on-duty": "bg-emerald-50 text-emerald-800",
  "off-duty": "bg-stone-100 text-stone-600",
  leave: "bg-amber-50 text-amber-800",
  scheduled: "bg-sky-50 text-sky-800",
  done: "bg-stone-100 text-stone-600",
  confirmed: "bg-emerald-50 text-emerald-800",
  express: "bg-amber-50 text-amber-900",
  standard: "bg-stone-100 text-stone-600",
  upcoming: "bg-sky-50 text-sky-800",
  completed: "bg-stone-100 text-stone-600",
  delayed: "bg-rose-50 text-rose-800",
  truck: "bg-stone-100 text-stone-700",
  van: "bg-stone-100 text-stone-700",
  reefer: "bg-sky-50 text-sky-800",
  coach: "bg-emerald-50 text-emerald-800",
}

export function Pill({ value, children }: { value: string; children?: React.ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", TONES[value] ?? "bg-stone-100 text-stone-700")}>
      {children ?? labelize(value)}
    </span>
  )
}

export function PageIntro({
  kicker,
  title,
  text,
  action,
}: {
  kicker: string
  title: string
  text?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">{kicker}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        {text ? <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">{text}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-sm text-mute">{hint}</p> : null}
    </div>
  )
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{children}</p>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-sm text-mute">{children}</p>
}

export type MapPoint = {
  id: string
  lat: number
  lng: number
  label: string
  tone?: "accent" | "ink" | "warn" | "warehouse"
}

function boundsOf(points: MapPoint[]) {
  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const padLat = Math.max(0.2, (maxLat - minLat) * 0.38)
  const padLng = Math.max(0.2, (maxLng - minLng) * 0.38)
  return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng }
}

function project(point: MapPoint, bounds: ReturnType<typeof boundsOf>) {
  const x = ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100
  const y = ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * 100
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(88, Math.max(12, y)),
  }
}

function rank(tone: MapPoint["tone"]) {
  if (tone === "warehouse") return 0
  if (tone === "warn") return 1
  if (tone === "ink") return 2
  return 3
}

export function OpsMap({ points, className }: { points: MapPoint[]; className?: string }) {
  if (!points.length) return null
  const bounds = boundsOf(points)
  const placed = points.map((point) => ({ point, ...project(point, bounds), showLabel: false }))
  const accepted: { x: number; y: number }[] = []
  const ordered = [...placed].sort((a, b) => rank(a.point.tone) - rank(b.point.tone))
  for (const item of ordered) {
    if (!item.point.label) continue
    const crowded = accepted.some((spot) => Math.hypot(spot.x - item.x, spot.y - item.y) < 16)
    if (!crowded) {
      item.showLabel = true
      accepted.push({ x: item.x, y: item.y })
    }
  }
  return (
    <div className={cx("relative min-h-[320px] overflow-hidden rounded-2xl bg-[#e4eee8]", className)}>
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(#c9d9d0 1px, transparent 1px), linear-gradient(90deg, #c9d9d0 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.75),transparent_42%)]" />
      {placed.map((item) => (
        <div
          key={item.point.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          title={item.point.label}
        >
          <span
            className={cx(
              "mx-auto block ring-2 ring-white",
              item.point.tone === "warehouse" && "h-2.5 w-2.5 rounded-[3px] bg-ink",
              item.point.tone === "warn" && "h-2.5 w-2.5 rounded-full bg-rose-600",
              item.point.tone === "ink" && "h-2.5 w-2.5 rounded-full bg-ink",
              (!item.point.tone || item.point.tone === "accent") && "h-2.5 w-2.5 rounded-full bg-accent",
            )}
          />
          {item.showLabel ? (
            <span
              className={cx(
                "absolute top-1/2 z-10 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-sm",
                item.x < 45 ? "right-4" : "left-4",
              )}
            >
              {item.point.label}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function Back({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-mute hover:text-ink">
      {children}
    </Link>
  )
}
