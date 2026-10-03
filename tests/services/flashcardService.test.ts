import { describe, expect, it, vi } from "vitest";
import { REMOTE_URL, flashcardsUrl, loadFlashcards } from "../../src/services/flashcardService";
import { flashcardData, stubFlashcardsFetch } from "../helpers/flashcards";

describe("flashcardsUrl", () => {
  it("reads the local file in development and the GitHub copy when deployed", () => {
    expect(flashcardsUrl(true)).toBe("/flashcards.json");
    expect(flashcardsUrl(false)).toBe(REMOTE_URL);
    expect(REMOTE_URL).toBe("https://raw.githubusercontent.com/DanM7/flash-cards-data/main/flashcards.json");
  });
});

describe("loadFlashcards", () => {
  it("returns each subject's content, card sets filed under their subject", async () => {
    const fetchMock = stubFlashcardsFetch();
    const data = await loadFlashcards();
    expect(data.subjectData).toEqual(flashcardData.subjectData);
    expect(data.subjectData.math.decimalOperations.deckSize).toBe(50);
    expect(Object.keys(data.subjectData.science.cardSets ?? {})).toContain("human-body");
    expect(fetchMock).toHaveBeenCalledWith("/flashcards.json");
  });

  it("returns the grade and subject catalog and the app settings", async () => {
    stubFlashcardsFetch();
    const data = await loadFlashcards();
    expect(Object.keys(data)).toEqual(["appSettings", "catalog", "subjectData"]);
    expect(data.catalog.grades.map((grade) => grade.grade)).toEqual([2, 3, 4, 5, 6, "computer-science"]);
    expect(data.catalog.subjects.math).toEqual({ label: "Math", color: "red" });
    expect(data.appSettings.home.tagline).toBe("Practice that fits your grade");
    expect(data.appSettings.language).toBe("en-US");
  });

  it("fails when a list, section, or setting of the file is missing", async () => {
    const complete = () => ({
      appSettings: { language: "en-US", home: {}, multipleChoice: {}, typingAndVoice: {}, playText: {} },
      catalog: { subjects: {}, grades: [] },
      subjectData: { math: {}, reading: {}, french: {}, geography: {} }
    });
    /** The file with the value at a dotted path removed, or replaced. */
    const load = (path: string, value?: unknown) => {
      const body: Record<string, unknown> = complete();
      const keys = path.split(".");
      const parent = keys.slice(0, -1).reduce((node, key) => node[key] as Record<string, unknown>, body);
      const last = keys[keys.length - 1];
      if (value === undefined) {
        delete parent[last];
      } else {
        parent[last] = value;
      }
      stubFlashcardsFetch(body);
      return loadFlashcards();
    };
    const sections = [
      "appSettings",
      "appSettings.home",
      "appSettings.multipleChoice",
      "appSettings.typingAndVoice",
      "appSettings.playText",
      "catalog",
      "catalog.subjects",
      "subjectData",
      "subjectData.math",
      "subjectData.reading",
      "subjectData.french",
      "subjectData.geography"
    ];
    for (const path of sections) {
      await expect(load(path)).rejects.toThrow(`The flashcards file has no "${path}" section.`);
      await expect(load(path, null)).rejects.toThrow(`The flashcards file has no "${path}" section.`);
    }
    for (const value of [undefined, "", {}]) {
      await expect(load("appSettings.language", value)).rejects.toThrow(
        'The flashcards file has no "appSettings.language" setting.'
      );
    }
    await expect(load("catalog.grades")).rejects.toThrow('The flashcards file has no "catalog.grades" list.');
    await expect(load("catalog.grades", {})).rejects.toThrow('The flashcards file has no "catalog.grades" list.');
    stubFlashcardsFetch(null);
    await expect(loadFlashcards()).rejects.toThrow('The flashcards file has no "appSettings" section.');
    stubFlashcardsFetch(complete());
    await expect(loadFlashcards()).resolves.toEqual(complete());
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
