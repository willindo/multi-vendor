const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  
  // ✅ FIX: Move this to the top-level root object out of experimental
  allowedDevOrigins: ["172.22.23.134", "localhost:8000", "172.22.23.134:8000"],

  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ✅ ADD THIS: Tell Next.js to transpile the shared package
  transpilePackages: ['@shared'],
  
  // ✅ ADD THIS: Allow Next.js to watch files outside the root
  // watchOptions: {
  //   poll: true,
  //   interval: 1000,
  // },
  
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
  
  experimental: {
    // ✅ ADD THIS: Enable external dir support (optional, for Next.js 13+)
    externalDir: true, // This allows importing from outside the project root
  },
}

module.exports = nextConfig