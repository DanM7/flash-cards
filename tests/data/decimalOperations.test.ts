import { describe, expect, it } from "vitest";
import { __testing, createDecimalOperationsDeck } from "../../src/data/subjects/math/decimalOperations";
import { copyMathRules, flashcardData, mathRules } from "../helpers/flashcards";
import { seedRandom } from "../helpers/random";

const rules = mathRules.decimalOperations;
const { formatValue, buildChoices, buildHint, toCard } = __testing;
const info = { grade: 6, unitLabel: "Unit 1" };

describe("createDecimalOperationsDeck", () => {
  it("has 50 cards in rounds of 10", () => {
    expect([rules.deckSize, flashcardData.appSettings.multipleChoice.roundSize]).toEqual([50, 10]);
    expect(createDecimalOperationsDeck(rules, info)).toMatchObject({
      subject: "math",
      operation: "decimal-operations",
      grade: 6,
      unitLabel: "Unit 1"
    });
  });

  it("always includes a decimal, a hint, and four distinct choices with the answer", () => {
    for (let seed = 1; seed <= 150; seed += 1) {
      seedRandom(seed);
      const deck = createDecimalOperationsDeck(rules, info);
      expect(deck.cards).toHaveLength(rules.deckSize);
      for (const card of deck.cards) {
        expect(card.prompt).toMatch(/\d\.\d/);
        expect(card.hint).toBeTruthy();
        expect(card.choices).toHaveLength(4);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
  });

  it("makes one number a decimal and the other a whole number", () => {
    expect(rules.decimalOperands).toBe("one");
    const operands = (prompt: string) => (prompt.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    const sides = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      seedRandom(seed);
      for (const card of createDecimalOperationsDeck(rules, info).cards) {
        const numbers = operands(card.prompt);
        expect(numbers, card.prompt).toHaveLength(2);
        expect(numbers.filter((value) => !Number.isInteger(value)), card.prompt).toHaveLength(1);
        sides.add(Number.isInteger(numbers[0]) ? "second" : "first");
        if (card.prompt.includes("÷") && !Number.isInteger(numbers[0])) {
          expect(Number.isInteger(numbers[1])).toBe(true);
        }
      }
    }
    expect(sides).toEqual(new Set(["first", "second"]));
  });

  it("makes both numbers decimals when the rules ask for both", () => {
    const changed = copyMathRules().decimalOperations;
    changed.decimalOperands = "both";
    seedRandom(4);
    for (const card of createDecimalOperationsDeck(changed, info).cards) {
      const numbers = (card.prompt.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
      expect(numbers.every((value) => !Number.isInteger(value)), card.prompt).toBe(true);
    }
  });

  it("falls back to a fixed problem after 50 unreasonable attempts", () => {
    const changed = copyMathRules().decimalOperations;
    changed.answer = { min: 500, max: 500 };
    // An answer of 0 always passes, so no subtraction: two equal decimals would make one.
    changed.operations = ["add"];
    changed.deckSize = 1;
    expect(createDecimalOperationsDeck(changed, info).cards[0]).toMatchObject({
      prompt: "2.5 + 3",
      answers: ["5.5", "5.5"]
    });
    changed.decimalOperands = "both";
    expect(createDecimalOperationsDeck(changed, info).cards[0]).toMatchObject({
      prompt: "2.5 + 1.75",
      answers: ["4.25", "4.25"]
    });
  });

  it("follows changed rules: operations, units, and answer size", () => {
    const changed = copyMathRules().decimalOperations;
    changed.deckSize = 30;
    changed.operations = ["add"];
    changed.unitChance = 1;
    changed.units = ["feet"];
    changed.answer = { min: 0.01, max: 10 };
    seedRandom(9);
    const deck = createDecimalOperationsDeck(changed, info);
    expect(deck.cards).toHaveLength(30);
    for (const card of deck.cards) {
      expect(card.prompt).toMatch(/^[\d.]+ feet \+ [\d.]+ feet$/);
      expect(card.answers[0]).toMatch(/ feet$/);
      expect(Number(card.answers[1])).toBeLessThanOrEqual(10);
    }
  });
});

describe("decimal operation helpers", () => {
  it("formats money, units, and bare numbers", () => {
    expect(formatValue(1.5, "money")).toBe("$1.50");
    expect(formatValue(-1.5, "money")).toBe("-$1.50");
    expect(formatValue(2.5, "inches")).toBe("2.5 inches");
    expect(formatValue(3.10, "none")).toBe("3.1");
  });

  it("hints whole-number multiplication and falls back to lining up decimals for addition", () => {
    expect(buildHint({ a: 3, b: 4, op: "mul", unit: "none" })).toBe("Multiply 3 × 4 as whole numbers.");
    expect(buildHint({ a: 0.3, b: 0.01, op: "add", unit: "none" })).toBe(
      "Line up the decimal points (ones under ones, tenths under tenths), then add 0.3 + 0.01."
    );
  });

  it("fills in nearby values when common mistakes can't supply three wrong answers", () => {
    const choices = buildChoices({ a: 0.01, b: 0.01, op: "sub", unit: "none" }, 0, rules);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain("0");
    expect(choices).toContain("0.1");
  });

  it("refuses a problem without a decimal operand", () => {
    expect(() => toCard({ a: 2, b: 3, op: "add", unit: "none" }, rules)).toThrow(
      "Decimal deck problem must include a decimal operand: 2 add 3"
    );
  });
});
