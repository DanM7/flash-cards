import { describe, expect, it } from "vitest";
import type { FlashcardData } from "../../src/data/CardTypes";
import {
  colorFor,
  deckDescription,
  deckOptions,
  findDeckByUnit,
  getDeckOptionById,
  getDecksForGrade,
  gradeFor,
  playTextFor,
  resolveDeck,
  subjectLabelFor,
  subjectStepFor,
  unitsFor,
  type DeckOption
} from "../../src/data/decks";
import { copyFlashcardData, flashcardData, flashcards } from "../helpers/flashcards";

const option = (id: string, data: FlashcardData = flashcardData) => getDeckOptionById(data, id) as DeckOption;

describe("subjects", () => {
  it("gives every subject its label and fixed color", () => {
    expect(flashcardData.subjects).toEqual({
      math: { label: "Math", color: "red" },
      science: { label: "Science", color: "green" },
      french: { label: "French", color: "purple" },
      reading: { label: "Reading", color: "blue" },
      history: { label: "History", color: "yellow" },
      geography: { label: "Geography", color: "orange" }
    });
    expect(subjectLabelFor(flashcardData, "geography")).toBe("Geography");
    expect(colorFor(flashcardData, "reading")).toBe("blue");
  });

  it("falls back to the key and no color for a subject the file doesn't describe", () => {
    expect(subjectLabelFor(flashcardData, "art")).toBe("art");
    expect(colorFor(flashcardData, "art")).toBe("");
  });
});

describe("grades", () => {
  it("lists grades 2 through 6, each with its own tile color", () => {
    expect(flashcardData.grades.map((grade) => [grade.grade, grade.label, grade.color])).toEqual([
      [2, "2nd Grade", "sky"],
      [3, "3rd Grade", "violet"],
      [4, "4th Grade", "teal"],
      [5, "5th Grade", "rose"],
      [6, "6th Grade", "amber"]
    ]);
    expect(gradeFor(flashcardData, 9)).toBeUndefined();
  });

  it("only offers a subject step for grades that ask for one", () => {
    expect(subjectStepFor(flashcardData, 4)).toBeUndefined();
    expect(subjectStepFor(flashcardData, 9)).toBeUndefined();
    expect(subjectStepFor(flashcardData, 6)?.map((entry) => entry.subject)).toEqual([
      "math",
      "science",
      "french",
      "geography"
    ]);
  });

  it("only names subjects the file describes", () => {
    for (const grade of flashcardData.grades) {
      for (const entry of grade.subjects) {
        expect(flashcardData.subjects, `${grade.grade} ${entry.subject}`).toHaveProperty(entry.subject);
      }
    }
  });
});

describe("deck catalog", () => {
  it("builds ids from grade, subject, and a stable unit code", () => {
    const options = deckOptions(flashcardData);
    const ids = options.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of options) {
      expect(entry.id).toBe(`${entry.grade}-${entry.subject}-${entry.unit}`);
      expect(entry.unit).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("works the catalog out once per file", () => {
    expect(deckOptions(flashcardData)).toBe(deckOptions(flashcardData));
  });

  it("badges plain decks with the subject and unit decks with the unit", () => {
    expect(option("2-math-addition")).toMatchObject({
      title: "Addition",
      badge: "Math",
      gradeLabel: "2nd Grade",
      interaction: "multiple-choice",
      categories: []
    });
    expect(option("6-geography-europe-west")).toMatchObject({
      title: "Unit 4: Europe: West",
      badge: "Geography · Unit 4",
      unitName: "Unit 4",
      categories: ["geography-europe-west"]
    });
    expect(option("6-science-cells").categories).toEqual(["science-cells-unit1"]);
  });

  it("filters decks by grade", () => {
    const grade4 = getDecksForGrade(flashcardData, 4);
    expect(grade4.map((entry) => entry.id)).toEqual(["4-reading-sight-words", "4-math-addition-facts"]);
    expect(grade4.every((entry) => entry.interaction === "voice-or-type")).toBe(true);
  });

  it("lists units with their decks, including coming-soon units and the geography final", () => {
    const geography = unitsFor(flashcardData, 6, "geography") ?? [];
    expect(geography).toHaveLength(12);
    expect(geography[11]).toMatchObject({ label: "Final", title: "All Countries", option: { id: "6-geography-final" } });
    const math = unitsFor(flashcardData, 6, "math") ?? [];
    expect(math[0].option?.id).toBe("6-math-decimal-operations");
    expect(math.filter((unit) => !unit.option)).toHaveLength(9);
  });

  it("has no units list for subjects that list plain decks, or for unknown grades", () => {
    expect(unitsFor(flashcardData, 2, "math")).toBeNull();
    expect(unitsFor(flashcardData, 9, "math")).toBeNull();
  });

  it("returns null for an unknown deck id", () => {
    expect(getDeckOptionById(flashcardData, "nope")).toBeNull();
  });
});

describe("playTextFor", () => {
  it("layers the defaults, the subject, and the math operation", () => {
    const decimals = playTextFor(flashcardData, { subject: "math", operation: "decimal-operations", cards: [] });
    expect(decimals).toMatchObject({
      title: "Decimal Operations",
      choiceCue: "Solve this",
      promptName: "problem",
      finishedTitle: "You finished the deck!",
      choiceFinished: "Solid decimal practice. Head home when you want another round."
    });
    expect(playTextFor(flashcardData, { subject: "math", operation: "addition", cards: [] }).title).toBe("Math facts");
    expect(playTextFor(flashcardData, { subject: "sight-words", grade: 4, cards: [] })).toMatchObject({
      title: "Sight words",
      typingCue: "Say this word"
    });
  });

  it("uses the defaults for a deck type with no wording of its own", () => {
    expect(playTextFor(flashcardData, { subject: "custom", cards: [] })).toEqual(flashcardData.playText.default);
  });
});

describe("findDeckByUnit", () => {
  it("finds a deck by grade, subject, and unit code, ignoring case", () => {
    expect(findDeckByUnit(flashcardData, "6", "geography", " EUROPE-WEST ")?.id).toBe("6-geography-europe-west");
  });

  it("matches any subject when the subject is blank", () => {
    expect(findDeckByUnit(flashcardData, "4", "", "sight-words")?.id).toBe("4-reading-sight-words");
  });

  it("returns null for a blank, unknown, or mismatched unit", () => {
    expect(findDeckByUnit(flashcardData, "6", "geography", "  ")).toBeNull();
    expect(findDeckByUnit(flashcardData, "6", "geography", "atlantis")).toBeNull();
    expect(findDeckByUnit(flashcardData, "6", "science", "europe-west")).toBeNull();
    expect(findDeckByUnit(flashcardData, "5", "geography", "europe-west")).toBeNull();
  });
});

describe("deckDescription", () => {
  it("fills in how many flashcards the deck draws from", () => {
    expect(deckDescription(option("6-geography-europe-west"), flashcards)).toBe(
      "Name all 23 countries of Western Europe from a blank map."
    );
    expect(deckDescription(option("6-geography-final"), flashcards)).toBe(
      "All 194 countries in random order, mixed across every continent."
    );
  });

  it("leaves descriptions without a count alone", () => {
    const cells = option("6-science-cells");
    expect(deckDescription(cells, flashcards)).toBe(cells.description);
  });
});

describe("resolveDeck", () => {
  it("builds every deck option into a playable deck", async () => {
    for (const entry of deckOptions(flashcardData)) {
      const deck = await resolveDeck(entry, flashcardData);
      expect(deck.cards.length, entry.id).toBeGreaterThan(0);
      if (entry.interaction === "multiple-choice") {
        for (const card of deck.cards) {
          expect(card.choices, `${entry.id}: ${card.prompt}`).toContain(card.answers[0]);
          expect(new Set(card.choices).size).toBe(card.choices?.length);
        }
      }
    }
  }, 60_000);

  it("builds the 4th grade decks from their flashcards", async () => {
    const sightWords = await resolveDeck(option("4-reading-sight-words"), flashcardData);
    expect(sightWords).toMatchObject({ subject: "sight-words", grade: 4 });
    expect(sightWords).not.toHaveProperty("unitLabel");
    expect(sightWords.cards[0]).toEqual({ prompt: "a", answers: ["a"], acceptableTranscripts: ["hey"] });
    const addition = await resolveDeck(option("4-math-addition-facts"), flashcardData);
    expect(addition).toMatchObject({ subject: "math", operation: "addition" });
    expect(addition.cards[0]).toEqual({ prompt: "2 + 3", answers: ["5", "five"] });
  });

  it("labels each deck for the play screen", async () => {
    const labelOf = async (id: string) => {
      const deck = await resolveDeck(option(id), flashcardData);
      return "unitLabel" in deck ? deck.unitLabel : undefined;
    };
    expect(await labelOf("2-math-addition")).toBe("2nd Grade · Addition");
    expect(await labelOf("3-math-mixed")).toBe("3rd Grade · All Four Operations");
    expect(await labelOf("5-math-order-of-operations")).toBe("5th Grade · Order of Operations");
    expect(await labelOf("6-math-decimal-operations")).toBe("Unit 1");
    expect(await labelOf("6-science-cells")).toBe("Unit 1: Cells");
    expect(await labelOf("6-french-colors")).toBe("Unit 2: Colors");
    expect(await labelOf("6-geography-final")).toBe("Final: All Countries");
  });

  it("labels a decimal deck listed as a plain deck by grade and title", async () => {
    const data = copyFlashcardData();
    data.grades[0].subjects[0].decks?.push({
      unit: "decimals",
      title: "Decimals",
      description: "",
      build: { type: "decimalOperations" }
    });
    const deck = await resolveDeck(option("2-math-decimals", data), data);
    expect(deck).toMatchObject({ grade: 2, unitLabel: "2nd Grade · Decimals" });
  });

  it("rejects an unknown deck type or a deck with no cards", async () => {
    const data = copyFlashcardData();
    data.grades[0].subjects[0].decks = [
      { unit: "mystery", title: "Mystery", description: "", build: { type: "mystery" } as never },
      { unit: "empty", title: "Empty", description: "", build: { type: "cards", category: "nothing-here" } }
    ];
    await expect(resolveDeck(option("2-math-mystery", data), data)).rejects.toThrow('Unknown deck type "mystery".');
    await expect(resolveDeck(option("2-math-empty", data), data)).rejects.toThrow('Deck "2-math-empty" has no cards.');
  });
});
