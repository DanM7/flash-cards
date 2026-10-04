import { describe, expect, it } from "vitest";
import { createWholeNumberDeck, type WholeNumberTopic } from "../../src/data/subjects/math/wholeNumberOperations";
import { copyMathRules, mathRules } from "../helpers/flashcards";
import { queueRandom, seedRandom } from "../helpers/random";

const rules = mathRules.wholeNumberOperations;

const info = (grade: number, unitLabel = "Label") => ({ grade, unitLabel });

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

const operands = (prompt: string): number[] =>
  (/^(−?\d+) [+−×÷] \(?(−?\d+)\)?$/.exec(prompt) as RegExpExecArray).slice(1).map(parse);

const topics: [number, WholeNumberTopic][] = [
  [2, "add"],
  [2, "sub"],
  [2, "mixed"],
  [3, "add"],
  [3, "sub"],
  [3, "mul"],
  [3, "div"],
  [3, "mixed"],
  [4, "add"],
  [4, "sub"],
  [4, "mul"],
  [4, "div"],
  [4, "mixed"]
];

/** The two numbers in every card of a few seeded decks. */
const operandsOf = (grade: number, topic: WholeNumberTopic): number[][] => {
  const all: number[][] = [];
  for (let seed = 1; seed <= 20; seed += 1) {
    seedRandom(seed);
    all.push(...createWholeNumberDeck(topic, rules, info(grade)).cards.map((card) => operands(card.prompt)));
  }
  return all;
};

const between = (value: number, min: number, max: number) => value >= min && value <= max;

describe("createWholeNumberDeck", () => {
  it("reads the deck size and number ranges from flashcards.json", () => {
    expect(rules.deckSize).toBe(20);
    expect(rules.grades[2].range).toEqual({ min: 0, max: 100 });
    expect(rules.grades[3].range).toEqual({ min: 0, max: 100 });
    expect(rules.grades[4].range).toEqual({ min: 0, max: 1000 });
    expect([2, 3, 4].map((grade) => rules.grades[grade].negativeChance)).toEqual([0, 0, 0]);
  });

  it("3rd grade: sums and differences within 100, and times tables through 10", () => {
    for (const [a, b] of [...operandsOf(3, "add"), ...operandsOf(3, "sub")]) {
      expect(between(a, 1, 99) && between(b, 1, 99), `${a}, ${b}`).toBe(true);
    }
    expect(operandsOf(3, "sub").every(([a, b]) => a >= b)).toBe(true);
    expect(operandsOf(3, "mul").every(([a, b]) => between(a, 2, 10) && between(b, 2, 10))).toBe(true);
    expect(operandsOf(3, "div").every(([a, b]) => between(b, 2, 10) && between(a / b, 1, 10))).toBe(true);
  });

  it("4th grade: 2-digit sums and differences, 2-digit by 1-digit multiplication, and 2-digit by 1-digit division", () => {
    for (const [a, b] of [...operandsOf(4, "add"), ...operandsOf(4, "sub")]) {
      expect(between(a, 10, 99) && between(b, 10, 99), `${a}, ${b}`).toBe(true);
    }
    expect(operandsOf(4, "sub").every(([a, b]) => a >= b)).toBe(true);
    const products = operandsOf(4, "mul");
    expect(products.every(([a, b]) => between(a, 2, 99) && between(b, 2, 9))).toBe(true);
    expect(products.some(([a]) => a >= 10)).toBe(true);
    const quotients = operandsOf(4, "div");
    expect(quotients.every(([a, b]) => between(a, 4, 99) && between(b, 2, 9) && Number.isInteger(a / b))).toBe(true);
    expect(quotients.some(([a, b]) => a / b >= 10)).toBe(true);
  });

  it("handles negative numbers when a grade's rules allow them", () => {
    const signed = copyMathRules().wholeNumberOperations;
    signed.grades[3].range = { min: -1000, max: 1000 };
    signed.grades[3].negativeChance = 0.3;
    const prompts: string[] = [];
    for (let seed = 1; seed <= 20; seed += 1) {
      seedRandom(seed);
      for (const card of createWholeNumberDeck("mixed", signed, info(3)).cards) {
        prompts.push(card.prompt);
        const correct = evaluate(card.prompt);
        expect(card.answers[0]).toBe(correct < 0 ? `−${-correct}` : String(correct));
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
    expect(prompts.some((prompt) => prompt.includes("(−"))).toBe(true);
    expect(prompts.some((prompt) => prompt.startsWith("−"))).toBe(true);
  });

  it.each(topics)("grade %i %s: every card is solvable with four in-range choices", (grade, topic) => {
    const { min, max } = rules.grades[grade].range;
    for (let seed = 1; seed <= 40; seed += 1) {
      seedRandom(seed);
      const deck = createWholeNumberDeck(topic, rules, info(grade));
      expect(deck.cards).toHaveLength(rules.deckSize);
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

  it("takes its grade and label from the catalog", () => {
    expect(createWholeNumberDeck("add", rules, info(2, "2nd Grade · Addition"))).toMatchObject({
      subject: "math",
      operation: "addition",
      grade: 2,
      unitLabel: "2nd Grade · Addition"
    });
    expect(createWholeNumberDeck("mixed", rules, info(3, "3rd Grade · All Four Operations"))).toMatchObject({
      operation: "mixed",
      unitLabel: "3rd Grade · All Four Operations"
    });
    expect(createWholeNumberDeck("div", rules, info(3)).operation).toBe("division");
  });

  it("only offers the operations a grade's rules list", () => {
    expect(() => createWholeNumberDeck("mul", rules, info(2))).toThrow("Grade 2 math rules don't include mul.");
    const noGrade3 = copyMathRules().wholeNumberOperations;
    delete noGrade3.grades[3];
    expect(() => createWholeNumberDeck("add", noGrade3, info(3))).toThrow("No math rules for grade 3.");
  });

  it("never goes over 100 in 2nd grade addition, and puts the larger number first in subtraction", () => {
    // 0.99 rolls give 99 + 99, which is too big and gets re-rolled.
    queueRandom([0.5, 0.99, 0.5, 0.99]);
    const [first] = createWholeNumberDeck("add", rules, info(2)).cards;
    expect(evaluate(first.prompt)).toBeLessThanOrEqual(100);

    // First operand 12, second 56: swapped so the answer isn't negative.
    queueRandom([0.5, 0.025, 0.5, 0.52]);
    const [sub] = createWholeNumberDeck("sub", rules, info(2)).cards;
    expect(sub.prompt).toBe("56 − 12");
  });

  it("follows changed rules: smaller numbers, a different deck size, and fewer operations", () => {
    const changed = copyMathRules().wholeNumberOperations;
    changed.deckSize = 5;
    changed.grades[2].range = { min: 0, max: 20 };
    changed.grades[2].operations.add = { operand: { min: 1, max: 9 } };
    delete changed.grades[2].operations.sub;
    for (let seed = 1; seed <= 20; seed += 1) {
      seedRandom(seed);
      const deck = createWholeNumberDeck("mixed", changed, info(2));
      expect(deck.cards).toHaveLength(5);
      for (const card of deck.cards) {
        expect(card.prompt).toContain("+");
        expect(operands(card.prompt).every((value) => value >= 1 && value <= 9)).toBe(true);
        expect(evaluate(card.prompt)).toBeLessThanOrEqual(20);
      }
    }
  });

  it("falls back to nearby numbers when common mistakes can't make three wrong answers", () => {
    // 0 + 0 in 2nd grade: most mistakes land on 0 or below, so nearby numbers fill in.
    for (let seed = 1; seed <= 30; seed += 1) {
      seedRandom(seed);
      const deck = createWholeNumberDeck("sub", rules, info(2));
      for (const card of deck.cards) {
        expect(new Set(card.choices).size).toBe(4);
      }
    }
  });
});
