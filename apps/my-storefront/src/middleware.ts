// ==== ./src/middleware.ts ====
import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a MEDUSA_BACKEND_URL environment variable?"
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    const { regions } = await fetch(`${BACKEND_URL}/store/regions`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    }).then(async (response) => {
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.message)
      }
      return json
    })

    if (!regions?.length) {
      throw new Error(
        "No regions found. Please set up regions in your Medusa Admin."
      )
    }

    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = request.headers
      .get("x-vercel-ip-country")?.[0]
      ?.toLowerCase()

    const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Middleware.ts: Error getting the country code.")
    }
  }
}

/**
 * Middleware to handle region selection, onboarding status, and isolated vendor routes.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const vendorJwt = request.cookies.get("medusa_vendor_jwt")?.value
  const userRole = request.cookies.get("user_role")?.value

  // 🚀 VENDOR EXCEPTION BYPASS: Let vendor workspace routes pass cleanly through geographical routing
  if (pathname.startsWith("/vendor")) {
    if (
      !vendorJwt &&
      pathname !== "/vendor" &&
      !pathname.startsWith("/vendor/login")
    ) {
      const cacheId =
        request.cookies.get("_medusa_cache_id")?.value || crypto.randomUUID()
      const regionMap = await getRegionMap(cacheId)
      let targetCountry = (await getCountryCode(request, regionMap)) || "in"

      return NextResponse.redirect(
        new URL(`/${targetCountry.toLowerCase()}/account`, request.url)
      )
    }

    // Clean execution bypass for authenticated vendors
    return NextResponse.next()
  }

  // Vendor dashboard specific check
  if (pathname.startsWith("/vendor/dashboard")) {
    if (!vendorJwt || userRole !== "vendor") {
      const cacheId =
        request.cookies.get("_medusa_cache_id")?.value || crypto.randomUUID()
      const regionMap = await getRegionMap(cacheId)
      let targetCountry = (await getCountryCode(request, regionMap)) || "in"

      return NextResponse.redirect(
        new URL(`/${targetCountry.toLowerCase()}/account`, request.url)
      )
    }
  }

  // check if the url is a static asset
  if (pathname.includes(".")) {
    return NextResponse.next()
  }

  let redirectUrl = request.nextUrl.href
  let response = NextResponse.redirect(redirectUrl, 307)
  let cacheIdCookie = request.cookies.get("_medusa_cache_id")
  let cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)
  const countryCode = regionMap && (await getCountryCode(request, regionMap))

  const urlHasCountryCode =
    countryCode && pathname.split("/")[1].includes(countryCode)

  if (urlHasCountryCode && cacheIdCookie) {
    return NextResponse.next()
  }

  if (urlHasCountryCode && !cacheIdCookie) {
    response.cookies.set("_medusa_cache_id", cacheId, {
      maxAge: 60 * 60 * 24,
    })
    return response
  }

  const redirectPath = pathname === "/" ? "" : pathname
  const queryString = request.nextUrl.search ? request.nextUrl.search : ""

  if (!urlHasCountryCode && countryCode) {
    redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
  } else if (!urlHasCountryCode && !countryCode) {
    return new NextResponse(
      "No valid regions configured. Please set up regions with countries in your Medusa Admin.",
      { status: 500 }
    )
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
