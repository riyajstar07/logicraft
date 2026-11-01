import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySession } from "./lib/session"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  if (pathname.startsWith("/api/network")) {
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    return NextResponse.next()
  }
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
}
