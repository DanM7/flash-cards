import { describe, expect, it } from "vitest";
import { createColorsDeck } from "../../src/data/subjects/french/grade6";
import {
  cellsDeck,
  environmentalScienceDeck,
  evolutionDeck,
  geneticsDeck,
  humanBodyDeck
} from "../../src/data/subjects/science/grade6";
import { seedRandom } from "../helpers/random";

describe("6th grade science decks", () => {
  it("labels each unit and keeps the right answer among the choices", () => {
    const decks = [cellsDeck, humanBodyDeck, geneticsDeck, evolutionDeck, environmentalScienceDeck];
    expect(decks.map((deck) => deck.unitLabel)).toEqual([
      "Unit 1: Cells",
      "Unit 2: Human Body",
      "Unit 3: Genetics",
      "Unit 4: Evolution",
      "Unit 5: Environmental Science"
    ]);
    for (const deck of decks) {
      expect(deck).toMatchObject({ subject: "science", grade: 6 });
      for (const card of deck.cards) {
        expect(card.choices).toHaveLength(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
    expect(cellsDeck.cards[0]).toMatchObject({ prompt: "What is the basic unit of life?", answers: ["Cell"] });
  });
});

describe("6th grade French colors deck", () => {
  it("has three cards per color with four distinct choices", () => {
    seedRandom(7);
    const deck = createColorsDeck();
    expect(deck).toMatchObject({ subject: "french", grade: 6, unitLabel: "Unit 2: Colors" });
    expect(deck.cards).toHaveLength(36);
    for (const card of deck.cards) {
      expect(new Set(card.choices).size).toBe(4);
      expect(card.choices).toContain(card.answers[0]);
      expect(card.hint).toBeTruthy();
    }
  });

  it("builds each card type with a helpful hint", () => {
    const deck = createColorsDeck();
    const byPrompt = new Map(deck.cards.map((card) => [card.prompt, card]));

    expect(byPrompt.get('How do you say "red" in French?')).toMatchObject({
      answers: ["rouge"],
      hint: 'It starts with "r": un ballon ___ (a red ball).'
    });
    expect(byPrompt.get('How do you say "orange" in French?')?.hint).toBe(
      'It starts with "o": une ___ (an orange fruit).'
    );
    expect(byPrompt.get('What does "bleu" mean?')).toMatchObject({
      answers: ["blue"],
      hint: `You'd see it in "le ciel est bleu".`
    });
    expect(byPrompt.get('What does "un chat noir" mean?')).toMatchObject({
      answers: ["a black cat"],
      hint: 'The color word is "noir".'
    });
    expect(byPrompt.get('What does "une feuille verte" mean?')?.hint).toBe(
      `"verte" is "vert" + e because "feuille" is feminine.`
    );
    expect(byPrompt.get('What does "des fleurs violettes" mean?')?.answers).toEqual(["purple flowers"]);
  });
});
