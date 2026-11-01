import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { isNetwork, loadNetwork, saveNetwork } from "@/lib/accounts"
import { SESSION_COOKIE, verifySession } from "@/lib/session"

export const runtime = "nodejs"

async function session() {
  const jar = await cookies()
  return verifySession(jar.get(SESSION_COOKIE)?.value)
}

export async function GET() {
  const user = await session()
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  const state = await loadNetwork(user.sub)
  return NextResponse.json({ state, user: { email: user.email, name: user.name } })
}

export async function PUT(request: Request) {
  const user = await session()
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { state?: unknown } | null
  if (!body || !isNetwork(body.state)) {
    return NextResponse.json({ error: "The network payload is incomplete" }, { status: 400 })
  }
  await saveNetwork(user.sub, body.state)
  return NextResponse.json({ ok: true })
}
