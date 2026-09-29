import { describe, expect, it } from "vitest";
import {
  colorClassFor,
  colorForSubject,
  deckOptions,
  findDeckByUnit,
  getDeckById,
  getDeckOptionById,
  getDecksForGrade,
  gradeOptions,
  resolveDeck,
  subjectAreasByGrade,
  subjectColors,
  unitsBySubjectArea,
  type DeckOption
} from "../../src/data/decks";

describe("subject colors", () => {
  it("gives every subject its fixed color", () => {
    expect(subjectColors).toEqual({
      math: "red",
      science: "green",
      french: "purple",
      reading: "blue",
      history: "yellow",
      geography: "orange"
    });
  });

  it("treats sight words as reading and has no color for other deck subjects", () => {
    expect(colorForSubject("sight-words")).toBe("blue");
    expect(colorForSubject("geography")).toBe("orange");
    expect(colorForSubject("vocabulary")).toBeUndefined();
  });

  it("gives a class-friendly color name, blank when there is none", () => {
    expect(colorClassFor("science")).toBe("green");
    expect(colorClassFor("custom")).toBe("");
  });
});

describe("deck catalog", () => {
  it("lists grades 2 through 6", () => {
    expect(gradeOptions.map((option) => option.grade)).toEqual([2, 3, 4, 5, 6]);
  });

  it("gives every deck a unique id and a stable unit code unique within its grade and subject", () => {
    const ids = deckOptions.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = deckOptions.map((option) => `${option.grade}|${option.subject}|${option.unit}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const option of deckOptions) {
      expect(option.unit).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("filters decks by grade", () => {
    const grade4 = getDecksForGrade(4);
    expect(grade4.map((option) => option.unit)).toEqual(["sight-words", "addition-facts"]);
    expect(grade4.every((option) => option.interaction === "voice-or-type")).toBe(true);
  });

  it("links every 6th grade unit with a deck to a real deck option", () => {
    for (const units of Object.values(unitsBySubjectArea)) {
      for (const unit of units) {
        if (unit.deckId) {
          expect(getDeckOptionById(unit.deckId)).not.toBeNull();
        }
      }
    }
    const geography = unitsBySubjectArea.geography;
    expect(geography).toHaveLength(12);
    expect(geography[geography.length - 1]).toMatchObject({ unit: 12, label: "Final", title: "All Countries" });
    expect(unitsBySubjectArea.math.filter((unit) => !unit.deckId)).toHaveLength(9);
  });

  it("only offers a subject step for grades that have one", () => {
    expect(subjectAreasByGrade[4]).toBeUndefined();
    expect(subjectAreasByGrade[6]?.map((area) => area.id)).toEqual(["math", "science", "french", "geography"]);
  });

  it("returns null for an unknown deck id", () => {
    expect(getDeckOptionById("nope")).toBeNull();
  });
});

describe("findDeckByUnit", () => {
  it("finds a deck by grade, subject, and unit code, ignoring case", () => {
    expect(findDeckByUnit("6", "geography", " EUROPE-WEST ")?.id).toBe("geography-europe-west-unit4");
  });

  it("matches any subject when the subject is blank", () => {
    expect(findDeckByUnit("4", "", "sight-words")?.id).toBe("sight-words-grade4");
  });

  it("returns null for a blank, unknown, or mismatched unit", () => {
    expect(findDeckByUnit("6", "geography", "  ")).toBeNull();
    expect(findDeckByUnit("6", "geography", "atlantis")).toBeNull();
    expect(findDeckByUnit("6", "science", "europe-west")).toBeNull();
    expect(findDeckByUnit("5", "geography", "europe-west")).toBeNull();
  });
});

describe("resolveDeck", () => {
  it("builds every deck option into a playable deck", async () => {
    for (const option of deckOptions) {
      const deck = await resolveDeck(option);
      expect(deck.cards.length, option.id).toBeGreaterThan(0);
      if (option.interaction === "multiple-choice") {
        for (const card of deck.cards) {
          expect(card.choices, `${option.id}: ${card.prompt}`).toContain(card.answers[0]);
          expect(new Set(card.choices).size).toBe(card.choices?.length);
        }
      }
    }
  }, 60_000);

  it("uses the static deck, and fails when an option has neither", async () => {
    const withDeck = deckOptions.find((option) => option.deck) as DeckOption;
    expect(await resolveDeck(withDeck)).toBe(withDeck.deck);
    const broken = { ...withDeck, id: "broken", deck: undefined, createDeck: undefined };
    await expect(resolveDeck(broken)).rejects.toThrow('Deck option "broken" has no deck.');
  });
});

describe("getDeckById", () => {
  it("resolves a deck by id, or null when unknown", async () => {
    expect((await getDeckById("science-cells-unit1"))?.subject).toBe("science");
    expect(await getDeckById("nope")).toBeNull();
  });
});
