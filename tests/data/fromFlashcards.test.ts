import { describe, expect, it } from "vitest";
import type { Flashcard } from "../../src/data/CardTypes";
import { deckOptions } from "../../src/data/decks";
import { cardsIn, flashcardsIn, toCard } from "../../src/data/fromFlashcards";
import { flashcardData, flashcards } from "../helpers/flashcards";
import { seedRandom } from "../helpers/random";

describe("toCard", () => {
  it("turns a plain question and answer into a card", () => {
    expect(toCard({ question: "Q", answer: "A" }, 3)).toEqual({ prompt: "Q", answers: ["A"] });
  });

  it("carries over accepted answers, hints, maps, and speech alternatives", () => {
    const flashcard: Flashcard = {
      question: "Q",
      answer: "for",
      acceptedAnswers: ["4"],
      hint: "H",
      countryId: "250",
      acceptableTranscripts: ["four"]
    };
    expect(toCard(flashcard, 3)).toEqual({
      prompt: "Q",
      answers: ["for", "4"],
      hint: "H",
      map: { countryId: "250" },
      acceptableTranscripts: ["four"]
    });
  });

  it("zooms a map out to the card's continent", () => {
    expect(toCard({ question: "Q", answer: "France", countryId: "250", continent: "europe" }, 3).map).toEqual({
      countryId: "250",
      continent: "europe"
    });
  });

  it("keeps up to four choices as written", () => {
    expect(toCard({ question: "Q", answer: "B", choices: ["A", "B", "C", "D"] }, 3).choices).toEqual(["A", "B", "C", "D"]);
  });

  it("picks the answer and three wrong choices from a longer list", () => {
    seedRandom(3);
    const pool = ["A", "B", "C", "D", "E", "F", "G"];
    const picks = [1, 2, 3, 4, 5].map(() => toCard({ question: "Q", answer: "D", choices: pool }, 3).choices ?? []);
    for (const choices of picks) {
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain("D");
    }
    expect(new Set(picks.flat()).size).toBeGreaterThan(4);
  });

  it("shows as many wrong choices as it's told to", () => {
    const pool = ["A", "B", "C", "D", "E", "F", "G"];
    const choices = toCard({ question: "Q", answer: "D", choices: pool }, 5).choices ?? [];
    expect(choices).toHaveLength(6);
    expect(choices).toContain("D");
    expect(toCard({ question: "Q", answer: "B", choices: ["A", "B", "C"] }, 1).choices).toHaveLength(2);
  });
});

describe("cardsIn", () => {
  it("builds the cards of one category, in file order", () => {
    const cards = cardsIn(flashcards, "math-addition-grade4", 3);
    expect(cards).toHaveLength(flashcardsIn(flashcards, "math-addition-grade4").length);
    expect(cards[0]).toEqual({ prompt: "2 + 3", answers: ["5", "five"] });
    expect(cardsIn(flashcards, "nope", 3)).toEqual([]);
  });
});

describe("flashcards.json", () => {
  it("gives every card a question, an answer, and a category", () => {
    for (const card of flashcards) {
      expect(card.question, JSON.stringify(card)).toBeTruthy();
      expect(card.answer, JSON.stringify(card)).toBeTruthy();
      expect(card.category, JSON.stringify(card)).toBeTruthy();
      if (card.choices) {
        expect(card.choices, card.question).toContain(card.answer);
        expect(new Set(card.choices).size, card.question).toBe(card.choices.length);
      }
    }
  });

  it("has cards for every category a deck draws from", () => {
    const categories = deckOptions(flashcardData).flatMap((option) => option.categories);
    expect(categories).toContain("sight-words-grade4");
    for (const category of categories) {
      expect(flashcardsIn(flashcards, category).length, category).toBeGreaterThan(0);
    }
  });
});
