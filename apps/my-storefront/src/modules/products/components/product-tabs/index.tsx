"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import Accordion from "./accordion"
import { ExtendedMarketplaceProduct } from "@/types/marketplace"

type ProductTabsProps = {
  product: ExtendedMarketplaceProduct
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
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
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

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-2 gap-x-8">
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold">Material</span>
            <p>{product.material ? product.material : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">Country of origin</span>
            <p>{product.origin_country ? product.origin_country : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">Type</span>
            <p>{product.type ? product.type.value : "-"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-y-4">
          <div>
            <span className="font-semibold">Weight</span>
            <p>{product.weight ? `${product.weight} g` : "-"}</p>
          </div>
          <div>
            <span className="font-semibold">Dimensions</span>
            <p>
              {product.length && product.width && product.height
                ? `${product.length}L x ${product.width}W x ${product.height}H`
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Custom Isolated Sub-Component for your extended database engine mappings
const ApparelInfoTab = ({ apparelDetail }: { apparelDetail: NonNullable<ExtendedMarketplaceProduct["apparel_detail"]> }) => {
  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {apparelDetail.material_composition && (
          <div>
            <span className="font-semibold">Composition</span>
            <p className="text-ui-fg-subtle">{apparelDetail.material_composition}</p>
          </div>
        )}
        {apparelDetail.fit && (
          <div>
            <span className="font-semibold">Fit Style</span>
            <p className="text-ui-fg-subtle uppercase">{apparelDetail.fit}</p>
          </div>
        )}
        {apparelDetail.gender && (
          <div>
            <span className="font-semibold">Gender</span>
            <p className="text-ui-fg-subtle uppercase">{apparelDetail.gender}</p>
          </div>
        )}
        {apparelDetail.sizing_group && (
          <div>
            <span className="font-semibold">Sizing Scale</span>
            <p className="text-ui-fg-subtle uppercase">{apparelDetail.sizing_group.replace(/_/g, " ")}</p>
          </div>
        )}
        {apparelDetail.season && (
          <div>
            <span className="font-semibold">Season</span>
            <p className="text-ui-fg-subtle uppercase">{apparelDetail.season}</p>
          </div>
        )}
        {apparelDetail.care_instructions && (
          <div className="col-span-2 mt-2">
            <span className="font-semibold">Care Instructions</span>
            <p className="text-ui-fg-subtle mt-1 text-xs leading-relaxed">{apparelDetail.care_instructions}</p>
          </div>
        )}
      </div>
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