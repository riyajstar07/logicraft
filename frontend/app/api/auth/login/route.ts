import { NextResponse } from "next/server"
import { authenticate } from "@/lib/accounts"
import { withSession } from "@/lib/cookie"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null
  const user = await authenticate(body?.email ?? "", body?.password ?? "")
  if (!user) {
    return NextResponse.json({ error: "That email and password don't match" }, { status: 401 })
  }
  return withSession(NextResponse.json({ user }), user)
}
