import { describe, expect, it } from "vitest";
import { GRADE5_DECK_SIZE, __testing, createGrade5Deck, type Grade5Topic } from "../../src/data/subjects/math/grade5";
import { queueRandom, seedRandom } from "../helpers/random";

const topics: Grade5Topic[] = ["multiplication", "division", "fractions", "decimals", "order-of-operations", "mixed"];

describe("createGrade5Deck", () => {
  it.each(topics)("%s: every card has a hint and four distinct choices with the answer", (topic) => {
    for (let seed = 1; seed <= 60; seed += 1) {
      seedRandom(seed);
      const deck = createGrade5Deck(topic);
      expect(deck.cards).toHaveLength(GRADE5_DECK_SIZE);
      for (const card of deck.cards) {
        expect(card.hint).toBeTruthy();
        expect(card.choices).toHaveLength(4);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
  });

  it("labels decks by topic", () => {
    expect(createGrade5Deck("decimals")).toMatchObject({
      subject: "math",
      operation: "decimal-operations",
      grade: 5,
      unitLabel: "5th Grade · Decimals"
    });
    expect(createGrade5Deck("order-of-operations").unitLabel).toBe("5th Grade · Order of Operations");
  });

  it("still finds wrong answers when the product's digits are all the same", () => {
    // 37 × 12 = 444, so there are no neighboring digits to swap.
    queueRandom([0.1, 0.29, 0]);
    const [card] = createGrade5Deck("multiplication").cards;
    expect(card).toMatchObject({ prompt: "37 × 12", answers: ["444"] });
    expect(new Set(card.choices).size).toBe(4);
  });

  it("re-rolls a decimal problem whose two numbers came out equal", () => {
    // Both operands roll 5.5; the second is re-rolled.
    queueRandom([0.1, 0.1, 0.1, 0.1, 0.5, 0.09, 0.5, 0.18]);
    const [card] = createGrade5Deck("decimals").cards;
    expect(card.prompt.startsWith("5.5 + ")).toBe(true);
    expect(card.prompt).not.toBe("5.5 + 5.5");
  });

  it("refuses a problem that can't supply three different wrong answers", () => {
    expect(() =>
      __testing.assembleChoices({ prompt: "1 + 0", answer: "1", hint: "", slightlyOff: ["2"], pool: [], fallback: [null, "1"] })
    ).toThrow('Not enough wrong answers for "1 + 0".');
  });
});
