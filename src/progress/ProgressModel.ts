export type ScoreMode = "practice" | "timed" | "typing" | "microphone";

/** Where a deck stands, reported by the play screens after every card. */
export interface DeckProgress {
  score: number;
  /** Points for answering every card so far on the first try. */
  possible: number;
  cardsPlayed: number;
  cardsTotal: number;
}

/** One played deck; it's unfinished when fewer cards were played than it has. */
export interface DeckResult extends DeckProgress {
  /** The catalog deck id, like "6-french-letters". */
  deckId: string;
  /** The deck's title when it was played, like "Unit 1: Alphabet · Accented Letters". */
  title: string;
  /** Grade and subject, like "6th Grade · French". */
  context: string;
  mode: ScoreMode;
  /** ISO 8601 timestamp. */
  finishedAt: string;
}

export interface ScoreHistory {
  /** Newest first, finished or not. */
  recent: DeckResult[];
  /** The best finished result for each deck and mode. */
  best: DeckResult[];
}
