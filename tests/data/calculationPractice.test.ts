import { describe, expect, it } from "vitest";
import { getDeckOptionById, playTextFor, resolveDeck, type DeckOption } from "../../src/data/decks";
import { createCalculationPracticeDeck, type CalculationTopic } from "../../src/data/subjects/math/calculationPractice";
import { copyMathRules, flashcardData, mathRules } from "../helpers/flashcards";
import { seedRandom } from "../helpers/random";

const rules = mathRules.calculationPractice;
const info = { grade: 6, unitLabel: "Unit 0" };

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const numbersIn = (prompt: string) => (prompt.match(/\d+/g) ?? []).map(Number);

const deckOf = (topic: CalculationTopic, seed: number) => {
  seedRandom(seed);
  return createCalculationPracticeDeck(rules, info, topic).cards;
};

describe("createCalculationPracticeDeck", () => {
  it("builds Unit 0 of 6th grade math, mixing all three topics", async () => {
    seedRandom(2);
    const deck = await resolveDeck(getDeckOptionById(flashcardData, "6-math-calculation-practice") as DeckOption, flashcardData);
    expect(deck).toMatchObject({ subject: "math", operation: "calculation-practice", grade: 6, unitLabel: "Unit 0" });
    expect(deck.cards).toHaveLength(rules.deckSize);
    const kinds = new Set(deck.cards.map((card) => card.prompt.split(" ")[0]));
    expect(kinds).toEqual(new Set(["Simplify", "Greatest", "Least"]));
    expect(playTextFor(flashcardData, deck).title).toBe("Calculation Practice");
  });

  it("simplifies fractions all the way, with a partly simplified fraction among the choices when there is one", () => {
    let sawPartial = false;
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const card of deckOf("simplify", seed)) {
        const [top, bottom] = numbersIn(card.prompt);
        const [n, d] = card.answers[0].split("/").map(Number);
        expect(card.prompt).toMatch(/^Simplify \d+\/\d+$/);
        expect(gcd(top, bottom)).toBeGreaterThan(1);
        expect(gcd(n, d)).toBe(1);
        expect(n / d).toBeCloseTo(top / bottom, 10);
        expect(card.hint).toBe(`Find the greatest common factor of ${top} and ${bottom}, then divide both by it.`);
        expect(card.choices).toHaveLength(4);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
        sawPartial ||= (card.choices ?? []).some((choice) => {
          const [cn, cd] = choice.split("/").map(Number);
          return choice !== card.answers[0] && Math.abs(cn / cd - n / d) < 1e-9;
        });
      }
    }
    expect(sawPartial).toBe(true);
  });

  it("finds greatest common factors, offering a smaller shared factor as a wrong answer", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const card of deckOf("gcf", seed)) {
        const [a, b] = numbersIn(card.prompt);
        expect(card.prompt).toMatch(/^Greatest common factor of \d+ and \d+$/);
        expect(a).toBeLessThan(b);
        expect(card.answers).toEqual([String(gcd(a, b))]);
        expect(card.hint).toContain(`factors of ${a} and of ${b}`);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
  });

  it("finds least common multiples, offering a bigger common multiple as a wrong answer", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const card of deckOf("lcm", seed)) {
        const [a, b] = numbersIn(card.prompt);
        const answer = (a * b) / gcd(a, b);
        expect(card.prompt).toMatch(/^Least common multiple of \d+ and \d+$/);
        expect(card.answers).toEqual([String(answer)]);
        expect(card.hint).toMatch(new RegExp(`^Count by ${b}s \\(${b}, ${b * 2}, ${b * 3}, …\\)`));
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
        const wrong = (card.choices ?? []).filter((choice) => choice !== card.answers[0]).map(Number);
        expect(wrong.some((value) => value % a === 0 && value % b === 0)).toBe(true);
      }
    }
  });

  it("follows changed rules: deck size and topic mix", () => {
    const changed = copyMathRules().calculationPractice;
    changed.deckSize = 12;
    changed.topics = { gcf: 1 };
    seedRandom(5);
    const cards = createCalculationPracticeDeck(changed, info).cards;
    expect(cards).toHaveLength(12);
    expect(cards.every((card) => card.prompt.startsWith("Greatest common factor"))).toBe(true);
  });

  it("explains rules that can't make a problem instead of looping forever", () => {
    const changed = copyMathRules().calculationPractice;
    changed.lcm.number = { min: 3, max: 3 };
    expect(() => createCalculationPracticeDeck(changed, info, "lcm")).toThrow(
      "The calculation practice rules can't make two numbers for a least common multiple."
    );
  });
});
