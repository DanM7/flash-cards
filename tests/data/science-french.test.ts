import { describe, expect, it } from "vitest";
import type { SubjectDeck } from "../../src/data/CardTypes";
import { getDeckOptionById, resolveDeck, type DeckOption } from "../../src/data/decks";
import { flashcardData } from "../helpers/flashcards";
import { seedRandom } from "../helpers/random";

const deck = (id: string): Promise<SubjectDeck> =>
  resolveDeck(getDeckOptionById(flashcardData, id) as DeckOption, flashcardData);

describe("6th grade science decks", () => {
  it("labels each unit and keeps the right answer among the choices", async () => {
    const decks = await Promise.all(
      ["cells", "human-body", "genetics", "evolution", "environmental-science"].map((unit) => deck(`6-science-${unit}`))
    );
    expect(decks.map((entry) => ("unitLabel" in entry ? entry.unitLabel : ""))).toEqual([
      "Unit 1: Cells",
      "Unit 2: Human Body",
      "Unit 3: Genetics",
      "Unit 4: Evolution",
      "Unit 5: Environmental Science"
    ]);
    for (const entry of decks) {
      expect(entry).toMatchObject({ subject: "science", grade: 6 });
      expect(entry.cards).toHaveLength(5);
      for (const card of entry.cards) {
        expect(card.choices).toHaveLength(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
    expect(decks[0].cards[0]).toEqual({
      prompt: "What is the basic unit of life?",
      answers: ["Cell"],
      choices: ["Atom", "Cell", "Tissue", "Organ"]
    });
  });
});

describe("6th grade French colors deck", () => {
  it("has three cards per color with four distinct choices", async () => {
    seedRandom(7);
    const colors = await deck("6-french-colors");
    expect(colors).toMatchObject({ subject: "french", grade: 6, unitLabel: "Unit 2: Colors" });
    expect(colors.cards).toHaveLength(36);
    for (const card of colors.cards) {
      expect(new Set(card.choices).size).toBe(4);
      expect(card.choices).toContain(card.answers[0]);
      expect(card.hint).toBeTruthy();
    }
  });

  it("builds each card type with a helpful hint", async () => {
    const byPrompt = new Map((await deck("6-french-colors")).cards.map((card) => [card.prompt, card]));

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

  it("draws fresh wrong answers from the same kind of answer each play", async () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      seedRandom(seed);
      const card = (await deck("6-french-colors")).cards.find((c) => c.prompt === 'What does "un ballon rouge" mean?');
      card?.choices?.forEach((choice) => seen.add(choice));
    }
    expect(seen.size).toBeGreaterThan(4);
    for (const choice of seen) {
      expect(choice).toMatch(/^an? \w+ ball$/);
    }
  });
});
