import { randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { get, put } from "@vercel/blob"
import seed from "@/data/seed.json"
import { DEMO_EMAIL, DEMO_PASSWORD } from "./demo"
import type { State } from "./types"

type UserRecord = {
  id: string
  email: string
  name: string
  salt: string
  passwordHash: string
}

function token() {
  const value = process.env.BLOB_READ_WRITE_TOKEN
  if (!value) throw new Error("Blob storage is not configured")
  return value
}

async function readJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private", token: token(), useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) return null
  const text = await new Response(result.stream).text()
  return JSON.parse(text) as T
}

async function writeJson(pathname: string, value: unknown) {
  await put(pathname, JSON.stringify(value), {
    access: "private",
    token: token(),
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  })
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const passwordHash = scryptSync(password, salt, 32).toString("hex")
  return { salt, passwordHash }
}

function passwordMatches(password: string, user: UserRecord) {
  const actual = Buffer.from(scryptSync(password, user.salt, 32).toString("hex"))
  const expected = Buffer.from(user.passwordHash)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

async function users() {
  const current = (await readJson<UserRecord[]>("auth/users.json")) ?? []
  if (current.some((user) => user.email === DEMO_EMAIL)) return current
  const hashed = hashPassword(DEMO_PASSWORD)
  const next = [
    ...current,
    { id: "user-riya", email: DEMO_EMAIL, name: "Riya Jaiswal", ...hashed },
  ]
  await writeJson("auth/users.json", next)
  return next
}

export async function registerAccount(name: string, email: string, password: string) {
  const cleanedEmail = email.trim().toLowerCase()
  const cleanedName = name.trim()
  if (cleanedName.length < 2) return { error: "Enter your name" as const }
  if (!cleanedEmail.includes("@") || cleanedEmail.length < 6) return { error: "Enter a valid email" as const }
  if (password.length < 6) return { error: "Use at least 6 characters" as const }
  const current = await users()
  if (current.some((user) => user.email === cleanedEmail)) {
    return { error: "An account with that email already exists" as const }
  }
  const record: UserRecord = {
    id: `user-${randomBytes(6).toString("hex")}`,
    email: cleanedEmail,
    name: cleanedName,
    ...hashPassword(password),
  }
  await writeJson("auth/users.json", [...current, record])
  return { user: publicUser(record) }
}

export async function authenticate(email: string, password: string) {
  const cleaned = email.trim().toLowerCase()
  const match = (await users()).find((user) => user.email === cleaned)
  if (!match || !passwordMatches(password, match)) return null
  return publicUser(match)
}

function publicUser(user: UserRecord) {
  return { id: user.id, email: user.email, name: user.name }
}

export function isNetwork(value: unknown): value is State {
  if (!value || typeof value !== "object") return false
  const state = value as State
  return Array.isArray(state.vehicles) && Array.isArray(state.shipments) && Array.isArray(state.tickets) && Array.isArray(state.stock)
}

export async function loadNetwork(userId: string) {
  const saved = await readJson<State>(`networks/${userId}.json`)
  if (saved && isNetwork(saved)) return saved
  const fresh = seed as State
  await writeJson(`networks/${userId}.json`, fresh)
  return fresh
}

export async function saveNetwork(userId: string, state: State) {
  await writeJson(`networks/${userId}.json`, state)
}

export async function resetNetwork(userId: string) {
  const fresh = seed as State
  await writeJson(`networks/${userId}.json`, fresh)
  return fresh
}
