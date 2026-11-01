export const SESSION_COOKIE = "lc_session"

type Session = {
  sub: string
  email: string
  name: string
  exp: number
}

function bytesToB64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function b64ToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  return bytesToB64(new Uint8Array(signature))
}

function secret() {
  return process.env.AUTH_SECRET || ""
}

export async function signSession(input: { sub: string; email: string; name: string }) {
  const key = secret()
  if (!key) throw new Error("AUTH_SECRET is not set")
  const payload: Session = { ...input, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }
  const body = bytesToB64(new TextEncoder().encode(JSON.stringify(payload)))
  return `${body}.${await hmac(body, key)}`
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  const key = secret()
  if (!token || !key || !token.includes(".")) return null
  const [body, signature] = token.split(".")
  if (!body || !signature) return null
  const expected = await hmac(body, key)
  if (expected.length !== signature.length) return null
  let mismatch = 0
  for (let i = 0; i < expected.length; i += 1) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  if (mismatch !== 0) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64ToBytes(body))) as Session
    if (!payload.sub || !payload.email || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
