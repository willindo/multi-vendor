import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductByHandle } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )
    if (!countryCodes) return []

    // Optionally: precompute a few handles per country
    // For now, skip static param generation to avoid Meili/Medusa drift
    return []
  } catch (error) {
    console.error(
      `Failed to generate static paths: ${error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images ?? []
  }
  const variant = product.variants.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images ?? []
  }
  const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]))
  return (product.images ?? []).filter((i) => imageIdsMap.has(i.id))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { handle, countryCode } = await props.params
  const region = await getRegion(countryCode)
  if (!region) notFound()

  const product = await getProductByHandle(handle, countryCode)
  if (!product) notFound()

  return {
    title: `${product.title} | Medusa Store`,
    description: product.description ?? product.title,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: product.description ?? product.title,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const { handle, countryCode } = await props.params
  const { v_id } = await props.searchParams

  const region = await getRegion(countryCode)
  if (!region) notFound()

  const product = await getProductByHandle(handle, countryCode)
  if (!product) notFound()

  const images = getImagesForVariant(product, v_id) ?? []

  return (
    <ProductTemplate
      product={product}
      region={region}
      countryCode={countryCode}
      images={images}
    />
  )
}