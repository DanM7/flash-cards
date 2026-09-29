import { describe, expect, it } from "vitest";
import {
  WHOLE_NUMBER_DECK_SIZE,
  createWholeNumberDeck,
  type WholeNumberGrade,
  type WholeNumberTopic
} from "../../src/data/subjects/math/wholeNumberOperations";
import { queueRandom, seedRandom } from "../helpers/random";

const parse = (text: string): number => Number(text.replace("−", "-"));

/** Evaluates prompts like "12 × (−3)" or "−40 ÷ 8". */
const evaluate = (prompt: string): number => {
  const match = /^(−?\d+) ([+−×÷]) \(?(−?\d+)\)?$/.exec(prompt);
  if (!match) {
    throw new Error(`Unexpected prompt: ${prompt}`);
  }
  const [, left, op, right] = match;
  const a = parse(left);
  const b = parse(right);
  return op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b;
};

const topics: [WholeNumberGrade, WholeNumberTopic][] = [
  [2, "add"],
  [2, "sub"],
  [2, "mixed"],
  [3, "add"],
  [3, "sub"],
  [3, "mul"],
  [3, "div"],
  [3, "mixed"]
];

describe("createWholeNumberDeck", () => {
  it.each(topics)("grade %i %s: every card is solvable with four in-range choices", (grade, topic) => {
    const [min, max] = grade === 2 ? [0, 100] : [-1000, 1000];
    for (let seed = 1; seed <= 40; seed += 1) {
      seedRandom(seed);
      const deck = createWholeNumberDeck(grade, topic);
      expect(deck.cards).toHaveLength(WHOLE_NUMBER_DECK_SIZE);
      for (const card of deck.cards) {
        const correct = evaluate(card.prompt);
        expect(card.answers[0]).toBe(correct < 0 ? `−${-correct}` : String(correct));
        expect(card.choices).toHaveLength(4);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
        for (const choice of card.choices ?? []) {
          const value = parse(choice);
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(min);
          expect(value).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it("labels decks by grade and topic", () => {
    expect(createWholeNumberDeck(2, "add")).toMatchObject({
      subject: "math",
      operation: "addition",
      grade: 2,
      unitLabel: "2nd Grade · Addition"
    });
    expect(createWholeNumberDeck(3, "mixed")).toMatchObject({ operation: "mixed", unitLabel: "3rd Grade · All Four Operations" });
    expect(createWholeNumberDeck(3, "div").operation).toBe("division");
  });

  it("keeps 2nd grade to addition and subtraction", () => {
    expect(() => createWholeNumberDeck(2, "mul")).toThrow("2nd grade only supports addition and subtraction (got mul).");
  });

  it("never goes over 100 in 2nd grade addition, and puts the larger number first in subtraction", () => {
    // 0.99 rolls give 99 + 99, which is too big and gets re-rolled.
    queueRandom([0.5, 0.99, 0.5, 0.99]);
    const [first] = createWholeNumberDeck(2, "add").cards;
    expect(evaluate(first.prompt)).toBeLessThanOrEqual(100);

    // First operand 12, second 56: swapped so the answer isn't negative.
    queueRandom([0.5, 0.025, 0.5, 0.52]);
    const [sub] = createWholeNumberDeck(2, "sub").cards;
    expect(sub.prompt).toBe("56 − 12");
  });

  it("falls back to nearby numbers when common mistakes can't make three wrong answers", () => {
    // 0 + 0 in 2nd grade: most mistakes land on 0 or below, so nearby numbers fill in.
    for (let seed = 1; seed <= 30; seed += 1) {
      seedRandom(seed);
      const deck = createWholeNumberDeck(2, "sub");
      for (const card of deck.cards) {
        expect(new Set(card.choices).size).toBe(4);
      }
    }
  });
});
