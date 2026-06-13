import { NextRequest } from "next/server"
import { searchSuggestions } from "@lib/search-server"

export async function GET(
  req: NextRequest
) {
  const query =
    req.nextUrl.searchParams.get("q") ||
    ""

  const hits =
    await searchSuggestions(query)

  return Response.json(hits)
}