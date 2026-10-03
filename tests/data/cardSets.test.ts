import { describe, expect, it } from "vitest";
import type { CardSet } from "../../src/data/CardTypes";
import { setCards, setSize } from "../../src/data/cardSets";
import { deckOptions } from "../../src/data/decks";
import { spreadWrongAnswers } from "../../src/data/wrongAnswers";
import { flashcardData } from "../helpers/flashcards";
import { seedRandom } from "../helpers/random";

describe("spreadWrongAnswers", () => {
  it("never gives a card one of its own answers, whatever the case or spacing", () => {
    const picked = spreadWrongAnswers([["Paris", "paris city"], ["Rome"]], [" PARIS", "paris city", "Rome", "Oslo"], 3);
    expect(picked[0].sort()).toEqual(["Oslo", "Rome"]);
    expect(picked[1].sort()).toEqual([" PARIS", "Oslo", "paris city"]);
  });

  it("lists each pool entry once, however it's capitalized", () => {
    const [picked] = spreadWrongAnswers([["A"]], ["B", "b", " B ", "C"], 3);
    expect(picked.sort()).toEqual(["B", "C"]);
  });

  it("uses every answer about equally often across a deck", () => {
    const answers = Array.from({ length: 50 }, (_, i) => `answer ${i}`);
    for (const seed of [1, 2, 3, 4, 5]) {
      seedRandom(seed);
      const picked = spreadWrongAnswers(
        answers.map((answer) => [answer]),
        answers,
        3
      );
      const uses = answers.map((answer) => picked.filter((wrong) => wrong.includes(answer)).length);
      expect(Math.max(...uses) - Math.min(...uses), `seed ${seed}`).toBeLessThanOrEqual(1);
      picked.forEach((wrong, i) => {
        expect(wrong).toHaveLength(3);
        expect(new Set(wrong).size).toBe(3);
        expect(wrong).not.toContain(answers[i]);
      });
    }
  });
});

describe("setCards", () => {
  const set: CardSet = {
    lang: "fr-FR",
    additionalIncorrectAnswers: ["Extra"],
    cards: {
      "Q1": "A1",
      "Q2": { answer: "A2", acceptedAnswers: ["two"], hint: "H2" },
      "Same": {},
      "Q4": { answer: "A4", incorrectAnswers: ["X", "Y", "Z", "W"] }
    }
  };

  it("counts the cards in a set", () => {
    expect(setSize(set)).toBe(4);
  });

  it("turns each question into a card, using the question when there's no answer", () => {
    expect(setCards(set)).toEqual([
      { prompt: "Q1", answers: ["A1"], lang: "fr-FR" },
      { prompt: "Q2", answers: ["A2", "two"], hint: "H2", lang: "fr-FR" },
      { prompt: "Same", answers: ["Same"], lang: "fr-FR" },
      { prompt: "Q4", answers: ["A4"], lang: "fr-FR" }
    ]);
    expect(setCards({ cards: { "Q": "A" } })).toEqual([{ prompt: "Q", answers: ["A"] }]);
  });

  it("draws wrong answers from the set's other answers and its additional wrong answers", () => {
    seedRandom(1);
    const [q1, q2, same] = setCards(set, 3);
    expect(q1.choices).toHaveLength(4);
    expect(q1.choices).toContain("A1");
    const pool = ["A1", "A2", "Same", "A4", "Extra"];
    for (const card of [q1, q2, same]) {
      expect(card.choices?.every((choice) => pool.includes(choice)), card.prompt).toBe(true);
      expect(new Set(card.choices).size).toBe(4);
    }
    expect([q1, q2, same].flatMap((card) => card.choices).filter((choice) => choice === "Extra").length).toBeGreaterThan(0);
  });

  it("uses a card's own wrong answers when it has them", () => {
    const q4 = setCards(set, 2)[3];
    expect(q4.choices).toHaveLength(3);
    expect(q4.choices).toContain("A4");
    expect(q4.choices?.filter((choice) => choice !== "A4").every((choice) => "XYZW".includes(choice))).toBe(true);
  });
});

describe("flashcards.json card sets", () => {
  it("has a non-empty set for every set a deck draws from", () => {
    const sets = deckOptions(flashcardData).flatMap((option) =>
      option.build.type === "cards" ? option.build.sets.map((key) => [option.subject, key] as const) : []
    );
    expect(sets).toContainEqual(["french", "accented-letters"]);
    for (const [subject, key] of sets) {
      const set = flashcardData.subjectData[subject]?.cardSets?.[key];
      expect(setSize(set ?? { cards: {} }), `${subject} ${key}`).toBeGreaterThan(0);
    }
  });

  it("gives every multiple-choice card enough different choices", () => {
    const { wrongChoices } = flashcardData.appSettings.multipleChoice;
    const sets = Object.entries(flashcardData.subjectData).flatMap(([subject, content]) =>
      Object.entries(content.cardSets ?? {}).map(([key, set]) => [`${subject} ${key}`, set] as const)
    );
    expect(sets.length).toBeGreaterThan(10);
    for (const [key, set] of sets) {
      for (const card of setCards(set, wrongChoices)) {
        expect(new Set(card.choices).size, `${key}: ${card.prompt}`).toBe(wrongChoices + 1);
        expect(card.choices, `${key}: ${card.prompt}`).toContain(card.answers[0]);
      }
    }
  });
});
