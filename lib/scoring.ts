import { LightPollutionInfo, ScoreInfo, WeatherInfo } from "@/types";

/**
 * Compute a deterministic stargazing score from 0–100.
 *
 * Rules:
 *  - Start at 100
 *  - Subtract cloudCover * 0.6  (cloud cover is 0–100 %)
 *  - If moon is above the horizon: subtract moonIllumination * 30
 *    (moonIllumination is 0–1)
 *  - If light-pollution data is available: subtract 4 points for each Bortle
 *    class above 1
 *  - Clamp result to [0, 100]
 */
export function computeScore(
  weather: WeatherInfo,
  moonIllumination: number,
  moonAboveHorizon: boolean,
  lightPollution: LightPollutionInfo
): ScoreInfo {
  const reasons: string[] = [];
  let score = 100;

  const cloudPenalty = weather.averageCloudCover * 0.6;
  score -= cloudPenalty;
  reasons.push(
    `Cloud cover ${weather.averageCloudCover.toFixed(1)}% (${weather.cloudCoverLabel}) → -${cloudPenalty.toFixed(1)} points`
  );

  const seeingPenalty = Math.max(0, weather.seeing - 3) * 2.5;
  if (seeingPenalty > 0) {
    score -= seeingPenalty;
    reasons.push(
      `Seeing ${weather.seeing.toFixed(1)} (${weather.seeingLabel}) → -${seeingPenalty.toFixed(1)} points`
    );
  } else {
    reasons.push(`Seeing ${weather.seeing.toFixed(1)} (${weather.seeingLabel}) → no seeing penalty`);
  }

  const transparencyPenalty = Math.max(0, weather.transparency - 3) * 2.5;
  if (transparencyPenalty > 0) {
    score -= transparencyPenalty;
    reasons.push(
      `Transparency ${weather.transparency.toFixed(1)} (${weather.transparencyLabel}) → -${transparencyPenalty.toFixed(1)} points`
    );
  } else {
    reasons.push(
      `Transparency ${weather.transparency.toFixed(1)} (${weather.transparencyLabel}) → no transparency penalty`
    );
  }

  if (weather.precipitationType !== "none") {
    score -= 25;
    reasons.push(`${weather.precipitationLabel} forecast during observing window → -25.0 points`);
  } else {
    reasons.push("No rain or snow forecast during observing window → no precipitation penalty");
  }

  if (moonAboveHorizon) {
    const moonPenalty = moonIllumination * 30;
    score -= moonPenalty;
    reasons.push(
      `Moon above horizon (${(moonIllumination * 100).toFixed(1)}% illuminated) → -${moonPenalty.toFixed(1)} points`
    );
  } else {
    reasons.push("Moon below horizon during observing window → no moon penalty");
  }

  if (lightPollution.available && lightPollution.bortleClass !== null) {
    const lightPollutionPenalty = Math.max(0, (lightPollution.bortleClass - 1) * 4);
    score -= lightPollutionPenalty;
    reasons.push(
      `Light pollution Bortle ${lightPollution.bortleClass} (${lightPollution.qualityLabel}) → -${lightPollutionPenalty.toFixed(1)} points`
    );
  } else {
    reasons.push("Light pollution unavailable → no artificial-light penalty applied");
  }

  score = Math.max(0, Math.min(100, score));
  reasons.push(`Final score: ${score.toFixed(1)} / 100`);

  return { value: Math.round(score), reasons };
}
