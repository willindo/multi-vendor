import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getRegion } from "@lib/data/regions"
import { getStorefrontDataByVendorId } from "@lib/meilisearch-client"
import ProductPreview from "@modules/products/components/product-preview"

type Props = {
  params: Promise<{ countryCode: string; id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  const { vendor } = await getStorefrontDataByVendorId(id, 1)

  if (!vendor) {
    return {
      title: "Artisan Atelier | Marketplace",
    }
  }

  return {
    title: `${vendor.name} Atelier | Collections`,
    description: `Browse curated compositions shipped directly from ${vendor.name}.`,
  }
}

export default async function VendorIdShopPage(props: Props) {
  const { countryCode, id } = await props.params
  
  const region = await getRegion(countryCode)
  if (!region) {
    notFound()
  }

  // Fetch verified products directly out of your Meilisearch engine index
  const { vendor, hits } = await getStorefrontDataByVendorId(id, 24)

  if (!vendor && hits.length === 0) {
    notFound()
  }

  const merchantName = vendor?.name || "Featured Partner"

  return (
    <div className="py-12 max-w-[1440px] mx-auto px-4 small:px-8 medium:px-16">
      {/* 👑 Premium Minimalist Header Component */}
      <div className="border-b border-neutral-100 pb-10 mb-12 flex flex-col gap-y-4">
        <div className="flex items-center gap-x-4">
          <div className="h-14 w-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-semibold tracking-widest select-none shadow-sm">
            {merchantName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-bold block mb-0.5">
              Verified Artisan Member
            </span>
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
              {merchantName}
            </h1>
          </div>
        </div>
        <p className="text-xs text-neutral-500 max-w-xl leading-relaxed">
          Welcome to the dedicated storefront of <span className="font-medium text-neutral-800">{merchantName}</span>. 
          All items listed below are composed, authenticated, and delivered directly from their workspace to your doorstep.
        </p>
      </div>

      {/* 📦 Collection Presentation Grid */}
      {hits.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-neutral-200 rounded-2xl">
          <p className="text-sm text-neutral-400">This partner has no items published on this storefront matching your region.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
              Showing {hits.length} Selections
            </span>
          </div>

          <ul
            className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
            data-testid="vendor-products-list"
          >
            {hits.map((product: any) => (
              <li key={product.id}>
                <ProductPreview 
                  product={product} 
                  region={region} 
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}