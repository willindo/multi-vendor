// ==== ./src/app/vendor/layout.tsx ====
import React from "react"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import VendorSignoutButton from "@modules/account/components/vendor-signout"

export const dynamic = "force-dynamic" // Prevent Next.js static engine build compilation failure

export const metadata = {
  title: "Healer | Merchant Workspace",
  description:
    "Merchant control dashboard panel for updating inventory and tracking shared marketplace operations.",
}

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const vendorJwt = cookieStore.get("medusa_vendor_jwt")?.value

  if (!vendorJwt) {
    redirect("/account")
  }

  return (
    <div className="flex min-h-screen bg-ui-bg-subtle text-ui-fg-base antialiased font-sans">
      {/* 🧭 Isolated Merchant Navigation Sidebar */}
      <aside className="w-64 bg-black text-white flex flex-col justify-between border-r border-ui-border-base p-6 fixed h-full z-20">
        <div className="flex flex-col gap-y-8">
          <div>
            <h2 className="text-large-semi tracking-wide uppercase text-ui-fg-on-color font-semibold">
              Healer Workspace
            </h2>
            <p className="text-xsmall-regular text-neutral-400 mt-1 tracking-wider uppercase">
              Artisan Engine v2
            </p>
          </div>

          <nav className="flex flex-col gap-y-2">
            <Link
              href="/vendor/dashboard"
              className="px-4 py-2.5 rounded-md text-small-semi text-ui-fg-on-color hover:bg-neutral-900 transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/vendor/dashboard/products"
              className="px-4 py-2.5 rounded-md text-small-semi text-ui-fg-on-color hover:bg-neutral-900 transition-colors"
            >
              My Products
            </Link>
            <Link
              href="/vendor/dashboard/orders"
              className="px-4 py-2.5 rounded-md text-small-semi text-ui-fg-on-color hover:bg-neutral-900 transition-colors"
            >
              Split Orders
            </Link>
          </nav>
        </div>
        <div className="border-t border-neutral-800 pt-4">
          <VendorSignoutButton />
        </div>
      </aside>

      {/* 🖥️ Dynamic Dashboard Main Body Frame */}
      <main className="flex-1 pl-64 min-h-screen flex flex-col">
        <header className="h-16 bg-white border-b border-ui-border-base flex items-center justify-between px-8 static top-0 w-full z-10">
          <span className="text-small-semi text-ui-fg-subtle uppercase tracking-wider text-xs">
            Active Storefront Session
          </span>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </header>

        <div className="p-8 flex-1 w-full max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
