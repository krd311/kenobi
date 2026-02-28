import { NextRequest, NextResponse } from "next/server";
import { geocodeCity, locationFromCoords } from "@/lib/geocode";
import { getSunInfo, getMoonInfo } from "@/lib/astronomy";
import { getWeatherInfo } from "@/lib/weather";
import { computeScore } from "@/lib/scoring";
import { EvaluateRequest, EvaluateResponse } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as EvaluateRequest;

    // Resolve location
    let location;
    if (body.city) {
      location = await geocodeCity(body.city);
    } else if (body.latitude !== undefined && body.longitude !== undefined) {
      location = locationFromCoords(body.latitude, body.longitude);
    } else {
      return NextResponse.json(
        { error: "Provide either 'city' or 'latitude' and 'longitude'." },
        { status: 400 }
      );
    }

    const today = new Date();

    const [sun, moon, weather] = await Promise.all([
      Promise.resolve(getSunInfo(today, location.latitude, location.longitude)),
      Promise.resolve(getMoonInfo(today, location.latitude, location.longitude)),
      getWeatherInfo(location.latitude, location.longitude, today),
    ]);

    const score = computeScore(
      weather.averageCloudCover,
      moon.illumination,
      moon.aboveHorizonDuringWindow
    );

    const response: EvaluateResponse = {
      location,
      sun,
      moon,
      weather,
      score,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
