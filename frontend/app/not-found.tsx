import Link from "next/link"

export default function NotFound() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">That page is not on the network</h1>
      <Link href="/" className="mt-4 inline-block text-sm underline">
        Back to overview
      </Link>
    </div>
  )
}
