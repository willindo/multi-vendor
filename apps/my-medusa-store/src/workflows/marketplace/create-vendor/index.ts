import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"

import {
  setAuthAppMetadataStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"

import createVendorStep from "./steps/create-vendor"
import createVendorAdminStep from "./steps/create-vendor-admin"

export type Input = {
  name: string
  handle?: string
  logo?: string
  admin: {
    email: string
    first_name?: string
    last_name?: string
  }
  authIdentityId: string
}

const createVendorWorkflow = createWorkflow(
  "create-vendor",
  function (input: Input) {
    const vendor = createVendorStep({
      name: input.name,
      handle: input.handle,
      logo: input.logo,
    })

    const adminData = transform(
      { input, vendor },
      (data) => ({
        ...data.input.admin,
        vendor_id: data.vendor.id,
      })
    )

    const admin = createVendorAdminStep(adminData)

   setAuthAppMetadataStep({
  authIdentityId: input.authIdentityId,
  actorType: "vendor",
  value: admin.vendorAdmin.id, 
})

    // fetch full vendor
    // @ts-ignore
    const { data } = useQueryGraphStep({
      entity: "vendor",
      fields: ["id", "name", "handle", "logo"],
      filters: { id: vendor.id },
    })

    return new WorkflowResponse({
      vendor: data[0],
    })
  }
)

export default createVendorWorkflow