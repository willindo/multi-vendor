// ==== ./src/api/middlewares.ts ====
import {
  defineMiddlewares,
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http";
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ConfigModule } from "@medusajs/framework/types";
import { parseCorsOrigins } from "@medusajs/framework/utils";
import cors from "cors";
import { z } from "@medusajs/framework/zod";
import { AdminCreateProduct } from "@medusajs/medusa/api/admin/products/validators";

const vendorRegistrationSchema = z.object({
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
    // 🛡️ STEP 1: Catch ALL custom vendor requests to allow cross-origin preflights
    {
      matcher: "/vendors*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          const configModule: ConfigModule = req.scope.resolve("configModule");

          return cors({
            origin: parseCorsOrigins(configModule.projectConfig.http.adminCors),
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "x-publishable-api-key"],
          })(req, res, next);
        },
      ],
    },

    // 🔑 STEP 2: Handle Initial Multi-Vendor Registration Route
    {
      matcher: "/vendors",
      method: ["POST"],
      middlewares: [
        authenticate("vendor", ["bearer"], {
          allowUnregistered: true,
        }),
        validateAndTransformBody(vendorRegistrationSchema),
      ],
    },

    // 🔒 STEP 3: Protected Sub-routes (Only runs AFTER CORS check clears)
    {
      matcher: "/vendors/*",
      middlewares: [
        authenticate("vendor", ["bearer"]),
      ],
    },
    {
      matcher: "/vendors/products",
      method: ["POST"],
      middlewares: [
        // validateAndTransformBody(AdminCreateProduct),
      ],
    },
    {
      matcher: "/store/products*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          req.allowed ??= [];
          req.allowed.push("apparel_detail");
          next();
        },
      ],
    },
    {
      matcher: "/store/payment-methods/:provider_id/:account_holder_id",
      method: "GET",
      middlewares: [
        authenticate("customer", ["bearer", "session"])
      ]
    }
  ],
});