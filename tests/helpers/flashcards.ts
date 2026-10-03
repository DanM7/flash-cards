import { vi } from "vitest";
import data from "../../../flash-cards-data/flashcards.json";
import type { FlashcardData, MathRules } from "../../src/data/CardTypes";

/** The real flashcards.json from the flash-cards-data repo next to this one; the app itself only ever fetches it. */
export const flashcardData = data as unknown as FlashcardData;
export const mathRules: MathRules = flashcardData.subjectData.math;

/** A deep copy of the math rules, safe to change in one test. */
export const copyMathRules = (): MathRules => structuredClone(mathRules);

/** A deep copy of the whole file, safe to change in one test. */
export const copyFlashcardData = (): FlashcardData => structuredClone(flashcardData);

/** Answers the app's flashcards request with `body` (the real file by default). */
export const stubFlashcardsFetch = (body: unknown = data, status = 200) => {
  const fetchMock = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
