import { LightPollutionInfo, ScoreInfo } from "@/types";

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
  averageCloudCover: number,
  moonIllumination: number,
  moonAboveHorizon: boolean,
  lightPollution: LightPollutionInfo
): ScoreInfo {
  const reasons: string[] = [];
  let score = 100;

  const cloudPenalty = averageCloudCover * 0.6;
  score -= cloudPenalty;
  reasons.push(
    `Cloud cover ${averageCloudCover.toFixed(1)}% → -${cloudPenalty.toFixed(1)} points`
  );

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
