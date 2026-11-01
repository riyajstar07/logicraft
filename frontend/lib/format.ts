export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

export function inr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function when(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function clock(hhmm: string) {
  const [hour, minute] = hhmm.split(":").map(Number)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

export function num(value: number) {
  return new Intl.NumberFormat("en-IN").format(value)
}

const LABELS: Record<string, string> = {
  "en-route": "En route",
  "picked-up": "Picked up",
  "in-transit": "In transit",
  "on-duty": "On duty",
  "off-duty": "Off duty",
  reefer: "Reefer",
}

export function labelize(value: string) {
  return LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}
