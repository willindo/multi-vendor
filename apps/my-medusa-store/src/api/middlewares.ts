import {
  defineMiddlewares,
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { AdminCreateProduct } from "@medusajs/medusa/api/admin/products/validators";

const schema = z.object({
  name: z.string(),
  handle: z.string().optional(),
  logo: z.string().optional(),
  admin: z.object({
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  }),
});

export default defineMiddlewares({
  routes: [
    {
      matcher: "/vendors",
      method: ["POST"],
      middlewares: [
        authenticate("vendor", ["bearer"], {
          allowUnregistered: true,
        }),
        validateAndTransformBody(schema),
      ],
    },
    {
      matcher: "/vendors/*",
      middlewares: [authenticate("vendor", ["bearer"])],
    },
    {
      matcher: "/vendors/products",
      method: ["POST"],
      middlewares: [
        // authenticate("vendor", ["bearer"]),
        validateAndTransformBody(AdminCreateProduct),
      ],
    },
  ],
});
