"use client"

import { useStore } from "@/lib/store"

export function ResetDemo() {
  const { reset } = useStore()
  return (
    <button
      className="btn-ghost mt-4"
      onClick={() => {
        if (window.confirm("Reset the demo back to this morning's network?")) reset()
      }}
    >
      Reset demo data
    </button>
  )
}
