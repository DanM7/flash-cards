import { describe, expect, it } from "vitest";
import { __testing, createGrade5Deck, type Grade5Topic } from "../../src/data/subjects/math/grade5";
import { copyMathRules, mathRules } from "../helpers/flashcards";
import { queueRandom, seedRandom } from "../helpers/random";

const rules = mathRules.grade5;

const info = { grade: 5, unitLabel: "5th Grade · Decimals" };

const topics: Grade5Topic[] = ["multiplication", "division", "fractions", "decimals", "order-of-operations", "mixed"];

describe("createGrade5Deck", () => {
  it.each(topics)("%s: every card has a hint and four distinct choices with the answer", (topic) => {
    for (let seed = 1; seed <= 60; seed += 1) {
      seedRandom(seed);
      const deck = createGrade5Deck(topic, rules, info);
      expect(deck.cards).toHaveLength(rules.deckSize);
      for (const card of deck.cards) {
        expect(card.hint).toBeTruthy();
        expect(card.choices).toHaveLength(4);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
  });

  it("takes its grade and label from the catalog", () => {
    expect(createGrade5Deck("decimals", rules, info)).toMatchObject({
      subject: "math",
      operation: "decimal-operations",
      grade: 5,
      unitLabel: "5th Grade · Decimals"
    });
  });

  it("still finds wrong answers when the product's digits are all the same", () => {
    // 37 × 12 = 444, so there are no neighboring digits to swap.
    queueRandom([0.1, 0.29, 0]);
    const [card] = createGrade5Deck("multiplication", rules, info).cards;
    expect(card).toMatchObject({ prompt: "37 × 12", answers: ["444"] });
    expect(new Set(card.choices).size).toBe(4);
  });

  it("re-rolls a decimal problem whose two numbers came out equal", () => {
    // Both operands roll 5.5; the second is re-rolled.
    queueRandom([0.1, 0.1, 0.1, 0.1, 0.5, 0.09, 0.5, 0.18]);
    const [card] = createGrade5Deck("decimals", rules, info).cards;
    expect(card.prompt.startsWith("5.5 + ")).toBe(true);
    expect(card.prompt).not.toBe("5.5 + 5.5");
  });

  it("refuses a problem that can't supply three different wrong answers", () => {
    expect(() =>
      __testing.assembleChoices({ prompt: "1 + 0", answer: "1", hint: "", slightlyOff: ["2"], pool: [], fallback: [null, "1"] })
    ).toThrow('Not enough wrong answers for "1 + 0".');
  });
});

describe("5th grade rules", () => {
  it("follows changed rules: deck size, factor sizes, and denominators", () => {
    const changed = copyMathRules().grade5;
    changed.deckSize = 4;
    changed.multiplication.shapes = [{ weight: 1, first: { min: 20, max: 20 }, second: { min: 3, max: 3 } }];
    changed.fractions.problems = { multiply: 1 };
    changed.fractions.wholeTimesFractionChance = 0;
    changed.fractions.denominators = [2];

    const product = createGrade5Deck("multiplication", changed, info);
    expect(product.cards).toHaveLength(4);
    expect(product.cards.every((card) => card.prompt === "20 × 3")).toBe(true);
    seedRandom(5);
    expect(createGrade5Deck("fractions", changed, info).cards.every((card) => card.prompt === "1/2 × 1/2")).toBe(true);
  });

  it("mixes only the topics listed, and only the order-of-operations templates listed", () => {
    const changed = copyMathRules().grade5;
    changed.mixed = { "order-of-operations": 1 };
    changed.orderOfOperations.templates = {
      "(a + b) × c": { weight: 1, numbers: { a: { min: 1, max: 1 }, b: { min: 2, max: 2 }, c: { min: 3, max: 3 } } }
    };
    const deck = createGrade5Deck("mixed", changed, info);
    expect(deck.cards.every((card) => card.prompt === "(1 + 2) × 3" && card.answers[0] === "9")).toBe(true);
  });

  it("rejects an order-of-operations template it doesn't know or that's missing a number", () => {
    const unknown = copyMathRules().grade5;
    unknown.orderOfOperations.templates = { "a ^ b": { weight: 1, numbers: {} } };
    expect(() => createGrade5Deck("order-of-operations", unknown, info)).toThrow(
      'Unknown order-of-operations template "a ^ b".'
    );
    const missing = copyMathRules().grade5;
    missing.orderOfOperations.templates = { "a + b × c": { weight: 1, numbers: { a: { min: 2, max: 9 } } } };
    expect(() => createGrade5Deck("order-of-operations", missing, info)).toThrow(
      'Order-of-operations template "a + b × c" needs a range for "b".'
    );
  });
});
