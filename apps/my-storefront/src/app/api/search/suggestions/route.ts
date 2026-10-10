// src/app/api/search/suggestions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { searchSuggestions } from "@lib/search-server"

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || ""

  if (!query.trim()) {
    return NextResponse.json([])
  }

  const hits = await searchSuggestions(query, 8)
  return NextResponse.json(hits)
}