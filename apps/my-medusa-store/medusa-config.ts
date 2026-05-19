import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,

    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  // modules: [],
    modules: [
      {
      // resolve: "@medusajs/medusa/event-bus-local",
      resolve: "@medusajs/medusa/event-bus-redis",
      options: { 
        redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
      },
    },
    {
      resolve: "./src/modules/marketplace",
      // key: "vendor",
    },
  ],
})