import type { DeckResult, ScoreHistory } from "./ProgressModel";

interface StoredScores {
  recent: DeckResult[];
  /** Keyed by `{deckId}:{mode}`. */
  best: Record<string, DeckResult>;
}

/**
 * Scores kept in this browser's local storage, until they move to a database. Only this module
 * touches storage, so swapping it out leaves the rest of the app alone.
 */
export class ProgressStore {
  static readonly storageKey = "flash-cards:scores";
  static readonly recentLimit = 25;

  private static read(): StoredScores {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) ?? "null");
      if (Array.isArray(stored?.recent) && stored.best && typeof stored.best === "object") {
        return stored;
      }
    } catch {
      // Unreadable scores start over.
    }
    return { recent: [], best: {} };
  }

  /** Storage can be full or turned off (some private windows); scores just aren't kept then. */
  private static write(scores: StoredScores) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(scores));
    } catch {
      // Nothing else to do without storage.
    }
  }

  private static share(result: DeckResult): number {
    return result.score / result.possible;
  }

  /** A higher percentage wins; on a tie, the higher score (a deck that has grown since). */
  private static beats(next: DeckResult, current: DeckResult | undefined): boolean {
    if (!current) {
      return true;
    }
    const difference = this.share(next) - this.share(current);
    return difference > 0 || (difference === 0 && next.score > current.score);
  }

  /** Every result goes in the recent list; only finished ones can be a high score. */
  static record(result: DeckResult): void {
    if (result.possible <= 0) {
      return;
    }
    const scores = this.read();
    const key = `${result.deckId}:${result.mode}`;
    scores.recent = [result, ...scores.recent].slice(0, this.recentLimit);
    if (result.cardsPlayed >= result.cardsTotal && this.beats(result, scores.best[key])) {
      scores.best[key] = result;
    }
    this.write(scores);
  }

  static history(): ScoreHistory {
    const { recent, best } = this.read();
    return { recent, best: Object.values(best) };
  }
}
