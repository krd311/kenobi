import { NextRequest, NextResponse } from "next/server";
import { reverseGeocodeCoords } from "@/lib/geocode";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const latValue = req.nextUrl.searchParams.get("lat");
    const lonValue = req.nextUrl.searchParams.get("lon");

    const latitude = latValue !== null ? Number(latValue) : NaN;
    const longitude = lonValue !== null ? Number(lonValue) : NaN;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Provide valid lat and lon query parameters." },
        { status: 400 }
      );
    }

    const location = await reverseGeocodeCoords(latitude, longitude);
    return NextResponse.json({ location });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
