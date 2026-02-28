import { NextRequest, NextResponse } from "next/server";
import { suggestPlaces } from "@/lib/geocode";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await suggestPlaces(query, 5);

    return NextResponse.json({
      suggestions: suggestions.map((item) => ({
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
