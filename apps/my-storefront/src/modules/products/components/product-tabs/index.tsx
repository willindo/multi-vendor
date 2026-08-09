"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import Accordion from "./accordion"
import { ExtendedMarketplaceProduct } from "@/types/marketplace"

type ProductTabsProps = {
  product: ExtendedMarketplaceProduct
}

const InfoRow = ({
  label,
  value,
}: {
  label: string
  value: string
}) => {
  return (
    <div className="flex flex-col gap-y-1">
      <span className="text-xs text-ui-fg-muted uppercase tracking-wide">
        {label}
      </span>

      <span className="text-sm text-ui-fg-base">
        {value}
      </span>
    </div>
  )
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const tabs = [
    {
      label: "Product Information",
      component: <ProductInfoTab product={product} />,
    },
    // Dynamically insert the Custom Apparel Specification tab only if data exists
    ...(product.apparel_detail
      ? [
        {
          label: "Specifications & Material",
          component: <ApparelInfoTab apparelDetail={product.apparel_detail} />,
        },
      ]
      : []),
    {
      label: "Shipping & Returns",
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {/* {tabs.map((tab, i) => ( */}
        {tabs.map((tab, i) => (
          <Accordion.Item
            // key={i}
            key={tab.label}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const ProductInfoTab = ({
  product,
}: ProductTabsProps) => {
  return (
    <div className="grid grid-cols-1 small:grid-cols-2 gap-y-4 gap-x-8 py-2">
      <InfoRow label="Product Information" value={product.description || "-"} />
      <InfoRow label="Material" value={product.material || "-"} />
      <InfoRow label="Country of origin" value={product.origin_country || "-"} />
      <InfoRow label="Type" value={product.type?.value || "-"} />
      <InfoRow label="Weight" value={product.weight ? `${product.weight} g` : "-"} />
      <InfoRow label="Dimensions" value={product.length && product.width && product.height ? `${product.length}L x ${product.width}W x ${product.height}H` : "-"} />
    </div>
  )
}
// Custom Isolated Sub-Component for your extended database engine mappings
const ApparelInfoTab = ({ apparelDetail }: { apparelDetail: NonNullable<ExtendedMarketplaceProduct["apparel_detail"]> }) => {
  return (
    <div className="grid grid-cols-1 small:grid-cols-2 gap-y-4 gap-x-8 py-2">
      <InfoRow label="Material Composition" value={apparelDetail.material_composition || "-"} />
      <InfoRow label="Care Instructions" value={apparelDetail.care_instructions || "-"} />
      {/* <InfoRow label="Country of Origin" value={apparelDetail.origin_country || "-"} /> */}
      <InfoRow label="Gender" value={apparelDetail.gender || "-"} />
      <InfoRow label="Age Group" value={apparelDetail.age_group || "-"} />
      <InfoRow label="Sizing Group" value={apparelDetail.sizing_group || "-"} />
      <InfoRow label="Garment Category" value={apparelDetail.garment_category || "-"} />
      <InfoRow label="Garment Subcategory" value={apparelDetail.garment_subcategory || "-"} />
      <InfoRow label="Fit" value={apparelDetail.fit || "-"} />
      <InfoRow label="Pattern" value={apparelDetail.pattern || "-"} />
      <InfoRow label="Style" value={apparelDetail.style_type || "-"} />
      <InfoRow label="Sleeve" value={apparelDetail.sleeve_type || "-"} />
      <InfoRow label="Neck" value={apparelDetail.neck_type || "-"} />
      <InfoRow label="Material Type" value={apparelDetail.material_type || "-"} />
      <InfoRow label="Occasion" value={apparelDetail.occasion || "-"} />
      <InfoRow label="Season" value={apparelDetail.season || "-"} />
      <InfoRow label="Condition" value={apparelDetail.condition || "-"} />
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-2">
          <FastDelivery />
          <div>
            <span className="font-semibold">Fast delivery</span>
            <p className="max-w-sm text-ui-fg-subtle">
              Your package will arrive in 3-5 business days at your pick up
              location or in the comfort of your home.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Refresh />
          <div>
            <span className="font-semibold">Simple exchanges</span>
            <p className="max-w-sm text-ui-fg-subtle">
              Is the fit not quite right? No worries - we&apos;ll exchange your
              product for a new one.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Back />
          <div>
            <span className="font-semibold">Easy returns</span>
            <p className="max-w-sm text-ui-fg-subtle">
              Just return your product and we&apos;ll refund your money. No
              questions asked – we&apos;ll do our best to make sure your return
              is hassle-free.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs