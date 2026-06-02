"use client"

import { signoutVendor } from "@lib/data/vendor"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

export default function VendorSignoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSignout = () => {
    startTransition(async () => {
      // 1. Run the server action to clear cookies
      await signoutVendor()
      
      // 2. Clear client-side router cache memory completely
      router.refresh()
      
      // 3. Force hard browser redirection to reset memory spaces
      window.location.href = "/account"
    })
  }

  return (
    <button
      onClick={handleSignout}
      disabled={isPending}
      className="text-neutral-400 hover:text-white transition-colors w-full text-left text-small-semi py-2 px-4 rounded-md hover:bg-neutral-900 disabled:opacity-50"
    >
      {isPending ? "Signing out..." : "Sign Out Workspace"}
    </button>
  )
}