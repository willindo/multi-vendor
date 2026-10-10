// src/app/[countryCode]/(main)/search/page.tsx
import { searchHandles } from "@lib/search-server"
import { listProductsByHandles } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { countryCode } = await params
  const { q } = await searchParams
  const region = await getRegion(countryCode)
  if (!region) return null

  const query = (q || "").trim()
  const handles = query ? await searchHandles(query, 48) : []
  const products = handles.length
    ? await listProductsByHandles({ countryCode, handles })
    : []

  return (
    <div className="content-container py-6">
      <h1 className="text-2xl-semi mb-6">
        {query ? `Results for “${query}”` : "Search"}
      </h1>
      {products.length === 0 ? (
        <p className="text-ui-fg-muted">No products found.</p>
      ) : (
        <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
          {products.map((p) => (
            <li key={p.id}>
              <ProductPreview product={p} region={region} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}