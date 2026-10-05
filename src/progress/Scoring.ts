import type { ScoringSettings } from "../data/CardTypes";

/** Points for a card answered right, after taking off for wrong tries and the hint. */
export const pointsForCard = (scoring: ScoringSettings, wrongTries: number, usedHint = false): number =>
  Math.max(scoring.minimum, scoring.firstTry - wrongTries * scoring.perWrongPick - (usedHint ? scoring.hint : 0));

/** "Score: 20 (67%)", or just "Score: 0" before any card is done. */
export const scoreText = (score: number, possible: number): string =>
  possible === 0 ? `Score: ${score}` : `Score: ${score} (${Math.round((score / possible) * 100)}%)`;
