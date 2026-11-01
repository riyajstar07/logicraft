import { NextResponse } from "next/server"
import { registerAccount } from "@/lib/accounts"
import { withSession } from "@/lib/cookie"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string; email?: string; password?: string } | null
  const result = await registerAccount(body?.name ?? "", body?.email ?? "", body?.password ?? "")
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return withSession(NextResponse.json({ user: result.user }), result.user)
}
