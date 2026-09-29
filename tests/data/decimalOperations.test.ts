import { describe, expect, it } from "vitest";
import {
  DECK_SIZE,
  ROUND_SIZE,
  TOTAL_ROUNDS,
  __testing,
  createDecimalOperationsDeck
} from "../../src/data/subjects/math/decimalOperations";
import { queueRandom, seedRandom } from "../helpers/random";

const { formatValue, buildChoices, buildHint, toCard } = __testing;

describe("createDecimalOperationsDeck", () => {
  it("has 50 cards in rounds of 10", () => {
    expect([DECK_SIZE, ROUND_SIZE, TOTAL_ROUNDS]).toEqual([50, 10, 5]);
    expect(createDecimalOperationsDeck()).toMatchObject({
      subject: "math",
      operation: "decimal-operations",
      grade: 6,
      unitLabel: "Unit 1"
    });
  });

  it("always includes a decimal, a hint, and four distinct choices with the answer", () => {
    for (let seed = 1; seed <= 150; seed += 1) {
      seedRandom(seed);
      const deck = createDecimalOperationsDeck();
      expect(deck.cards).toHaveLength(DECK_SIZE);
      for (const card of deck.cards) {
        expect(card.prompt).toMatch(/\d\.\d/);
        expect(card.hint).toBeTruthy();
        expect(card.choices).toHaveLength(4);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
  });

  it("falls back to a fixed problem after 50 unreasonable attempts", () => {
    // Each attempt: 0.01 ÷ 8.25, whose answer is too small to show, so it's thrown out.
    const attempt = [0.8, 0.1, 0.1, 0, 0.1, 0.9999, 0.9];
    queueRandom(Array.from({ length: 50 }, () => attempt).flat());
    const [card] = createDecimalOperationsDeck().cards;
    expect(card.prompt).toBe("2.5 + 1.75");
    expect(card.answers).toEqual(["4.25", "4.25"]);
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
    const choices = buildChoices({ a: 0.01, b: 0.01, op: "sub", unit: "none" }, 0);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain("0");
    expect(choices).toContain("0.1");
  });

  it("refuses a problem without a decimal operand", () => {
    expect(() => toCard({ a: 2, b: 3, op: "add", unit: "none" })).toThrow(
      "Decimal deck problem must include a decimal operand: 2 add 3"
    );
  });
});
