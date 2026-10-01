import { describe, expect, it, vi } from "vitest";
import { REMOTE_URL, flashcardsUrl, loadFlashcards } from "../../src/services/flashcardService";
import { flashcards, stubFlashcardsFetch } from "../helpers/flashcards";

describe("flashcardsUrl", () => {
  it("reads the local file in development and the GitHub copy when deployed", () => {
    expect(flashcardsUrl(true)).toBe("/src/data/flashcards.json");
    expect(flashcardsUrl(false)).toBe(REMOTE_URL);
    expect(REMOTE_URL).toBe("https://raw.githubusercontent.com/DanM7/flash-cards/main/src/data/flashcards.json");
  });
});

describe("loadFlashcards", () => {
  it("returns the file's cards and math rules", async () => {
    const fetchMock = stubFlashcardsFetch();
    const data = await loadFlashcards();
    expect(data.cards).toEqual(flashcards);
    expect(data.mathRules.decimalOperations.deckSize).toBe(50);
    expect(fetchMock).toHaveBeenCalledWith("/src/data/flashcards.json");
  });

  it("returns the grade and subject catalog and the home screen text", async () => {
    stubFlashcardsFetch();
    const data = await loadFlashcards();
    expect(data.grades.map((grade) => grade.grade)).toEqual([2, 3, 4, 5, 6]);
    expect(data.subjects.math).toEqual({ label: "Math", color: "red" });
    expect(data.home.tagline).toBe("Practice that fits your grade");
    expect(data.language).toBe("en-US");
  });

  it("fails when a list or section of the file is missing", async () => {
    const complete: Record<string, unknown> = {
      language: "en-US",
      cards: [],
      grades: [],
      home: {},
      subjects: {},
      multipleChoice: {},
      typingAndVoice: {},
      geography: {},
      playText: {},
      mathRules: {}
    };
    const load = (key: string, value?: unknown) => {
      const body = { ...complete };
      if (value === undefined) {
        delete body[key];
      } else {
        body[key] = value;
      }
      stubFlashcardsFetch(body);
      return loadFlashcards();
    };
    await expect(load("language")).rejects.toThrow('The flashcards file has no "language" setting.');
    await expect(load("language", "")).rejects.toThrow('The flashcards file has no "language" setting.');
    await expect(load("language", {})).rejects.toThrow('The flashcards file has no "language" setting.');
    for (const key of ["cards", "grades"]) {
      await expect(load(key)).rejects.toThrow(`The flashcards file has no "${key}" list.`);
      await expect(load(key, {})).rejects.toThrow(`The flashcards file has no "${key}" list.`);
    }
    for (const key of ["home", "subjects", "multipleChoice", "typingAndVoice", "geography", "playText", "mathRules"]) {
      await expect(load(key)).rejects.toThrow(`The flashcards file has no "${key}" section.`);
      await expect(load(key, null)).rejects.toThrow(`The flashcards file has no "${key}" section.`);
    }
    stubFlashcardsFetch(complete);
    await expect(loadFlashcards()).resolves.toEqual(complete);
  });

  it("fails on an HTTP error", async () => {
    stubFlashcardsFetch({}, 404);
    await expect(loadFlashcards()).rejects.toThrow("Couldn't load flashcards (HTTP 404).");
  });

  it("passes network errors on", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(loadFlashcards()).rejects.toThrow("Failed to fetch");
  });
});
