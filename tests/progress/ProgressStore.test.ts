import { describe, expect, it, vi } from "vitest";
import type { DeckResult } from "../../src/progress/ProgressModel";
import { ProgressStore } from "../../src/progress/ProgressStore";

const result = (changes: Partial<DeckResult> = {}): DeckResult => ({
  deckId: "2-math-addition",
  title: "Addition",
  context: "2nd Grade · Math",
  mode: "practice",
  score: 80,
  possible: 100,
  cardsPlayed: 10,
  cardsTotal: 10,
  finishedAt: "2026-10-05T12:00:00.000Z",
  ...changes
});

const stored = () => JSON.parse(localStorage.getItem(ProgressStore.storageKey) as string);

describe("ProgressStore", () => {
  it("starts empty", () => {
    expect(ProgressStore.history()).toEqual({ recent: [], best: [] });
  });

  it("keeps recent results newest first, up to the limit", () => {
    for (let i = 0; i < ProgressStore.recentLimit + 2; i += 1) {
      ProgressStore.record(result({ score: i }));
    }
    const { recent } = ProgressStore.history();
    expect(recent).toHaveLength(ProgressStore.recentLimit);
    expect(recent[0].score).toBe(ProgressStore.recentLimit + 1);
    expect(recent[recent.length - 1].score).toBe(2);
  });

  it("keeps each deck and mode's best result, even after it drops out of the recent list", () => {
    ProgressStore.record(result({ score: 90 }));
    ProgressStore.record(result({ score: 70 }));
    ProgressStore.record(result({ score: 95, mode: "timed" }));
    ProgressStore.record(result({ deckId: "2-math-subtraction", title: "Subtraction", score: 50 }));
    for (let i = 0; i < ProgressStore.recentLimit; i += 1) {
      ProgressStore.record(result({ deckId: "3-math-mixed", score: 10 }));
    }
    const best = ProgressStore.history().best.map((entry) => [entry.deckId, entry.mode, entry.score]);
    expect(best).toEqual([
      ["2-math-addition", "practice", 90],
      ["2-math-addition", "timed", 95],
      ["2-math-subtraction", "practice", 50],
      ["3-math-mixed", "practice", 10]
    ]);
  });

  it("ranks by percentage, then by score when the percentages tie", () => {
    ProgressStore.record(result({ score: 45, possible: 50, finishedAt: "first" }));
    ProgressStore.record(result({ score: 80, possible: 100, finishedAt: "lower percentage" }));
    ProgressStore.record(result({ score: 45, possible: 50, finishedAt: "same result" }));
    expect(ProgressStore.history().best[0].finishedAt).toBe("first");
    ProgressStore.record(result({ score: 90, possible: 100, finishedAt: "bigger deck" }));
    expect(ProgressStore.history().best[0].finishedAt).toBe("bigger deck");
  });

  it("lists unfinished decks as recent, but keeps them out of the high scores", () => {
    ProgressStore.record(result({ score: 50, possible: 50, cardsPlayed: 5, finishedAt: "unfinished" }));
    ProgressStore.record(result({ score: 60, finishedAt: "finished" }));
    ProgressStore.record(result({ score: 20, possible: 20, cardsPlayed: 2, finishedAt: "unfinished again" }));
    const { recent, best } = ProgressStore.history();
    expect(recent.map((entry) => entry.finishedAt)).toEqual(["unfinished again", "finished", "unfinished"]);
    expect(best.map((entry) => entry.finishedAt)).toEqual(["finished"]);
  });

  it("skips results with no points possible", () => {
    ProgressStore.record(result({ score: 0, possible: 0 }));
    expect(localStorage.getItem(ProgressStore.storageKey)).toBeNull();
  });

  it("saves to local storage as JSON", () => {
    ProgressStore.record(result());
    expect(stored()).toEqual({ recent: [result()], best: { "2-math-addition:practice": result() } });
  });

  it.each(["not json", "[]", '{"recent": []}', '{"recent": [], "best": "x"}', '{"best": {}}'])(
    "starts over when the saved scores are unreadable: %s",
    (saved) => {
      localStorage.setItem(ProgressStore.storageKey, saved);
      expect(ProgressStore.history()).toEqual({ recent: [], best: [] });
      ProgressStore.record(result());
      expect(ProgressStore.history().recent).toEqual([result()]);
    }
  );

  it("carries on without saving when storage is full or turned off", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(() => ProgressStore.record(result())).not.toThrow();
    expect(ProgressStore.history().recent).toEqual([]);
  });
});
