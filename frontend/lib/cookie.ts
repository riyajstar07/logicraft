import { NextResponse } from "next/server"
import { SESSION_COOKIE, signSession } from "./session"

export async function withSession(response: NextResponse, user: { id: string; email: string; name: string }) {
  response.cookies.set(SESSION_COOKIE, await signSession({ sub: user.id, email: user.email, name: user.name }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
