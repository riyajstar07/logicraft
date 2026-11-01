"use client"

import Link from "next/link"
import { useState } from "react"
import { SiteFooter } from "@/components/SiteFooter"
import { ErrorNote } from "@/components/ui"
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo"

export default function LoginPage() {
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in")
  const [name, setName] = useState("")
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Link href="/" className="font-serif text-xl tracking-tight">
          LogiCraft
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">Account</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">{mode === "sign-in" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-3 text-sm leading-6 text-mute">
          The review account is {DEMO_EMAIL} with password {DEMO_PASSWORD}. A new account starts from this morning&apos;s network and is stored for that login.
        </p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault()
            setPending(true)
            setError(null)
            const path = mode === "sign-in" ? "/api/auth/login" : "/api/auth/signup"
            const response = await fetch(path, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name, email, password }),
            })
            const body = (await response.json().catch(() => null)) as { error?: string } | null
            setPending(false)
            if (!response.ok) {
              setError(body?.error ?? "Could not sign in")
              return
            }
            const next = new URLSearchParams(window.location.search).get("next")
            window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/overview"
          }}
        >
          {mode === "create" ? (
            <label className="grid gap-1 text-sm">
              Name
              <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          ) : null}
          <label className="grid gap-1 text-sm">
            Email
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm">
            Password
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <button className="btn-accent" type="submit" disabled={pending}>
            {pending ? "Checking…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          className="btn-quiet mt-4 justify-self-start"
          onClick={() => {
            setMode(mode === "sign-in" ? "create" : "sign-in")
            setError(null)
          }}
        >
          {mode === "sign-in" ? "Create an account" : "I already have an account"}
        </button>
      </main>
      <SiteFooter />
    </div>
  )
}
