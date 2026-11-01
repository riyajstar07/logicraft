import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { resetNetwork } from "@/lib/accounts"
import { SESSION_COOKIE, verifySession } from "@/lib/session"

export const runtime = "nodejs"

export async function POST() {
  const jar = await cookies()
  const user = await verifySession(jar.get(SESSION_COOKIE)?.value)
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  const state = await resetNetwork(user.sub)
  return NextResponse.json({ state })
}
