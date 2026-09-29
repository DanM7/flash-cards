import { describe, expect, it } from "vitest";
import type { Card } from "../../src/data/CardTypes";
import { AnswerInterpreter } from "../../src/nlp/AnswerInterpreter";

const card = (answers: string[], extra: Partial<Card> = {}): Card => ({ prompt: answers[0], answers, ...extra });

describe("AnswerInterpreter", () => {
  it("accepts an exact match", () => {
    const result = AnswerInterpreter.interpret("Seven", card(["seven", "7"]));
    expect(result).toMatchObject({ isCorrect: true, matchType: "exact", normalizedInput: "seven" });
  });

  it("accepts common speech confusions for the answer", () => {
    expect(AnswerInterpreter.interpret("two", card(["to"])).matchType).toBe("exact");
    expect(AnswerInterpreter.interpret("four", card(["for"])).isCorrect).toBe(true);
  });

  it("accepts listed acceptable transcripts", () => {
    const result = AnswerInterpreter.interpret("thee", card(["the"], { acceptableTranscripts: ["thee"] }));
    expect(result.isCorrect).toBe(true);
  });

  it("flags ambiguous words instead of scoring them", () => {
    const fromMap = AnswerInterpreter.interpret("and", card(["an"]));
    expect(fromMap).toMatchObject({ isCorrect: false, matchType: "ambiguous", ambiguousWith: ["and"] });

    const fromCard = AnswerInterpreter.interpret("sea", card(["see"], { ambiguousTranscripts: ["sea"] }));
    expect(fromCard.matchType).toBe("ambiguous");
  });

  it("uses an includes match only for multi-word input or answers", () => {
    expect(AnswerInterpreter.interpret("the answer is fish", card(["fish"])).matchType).toBe("includes");
    expect(AnswerInterpreter.interpret("fish", card(["gold fish"])).matchType).toBe("includes");
  });

  it("allows one typo on longer answers but none on short ones", () => {
    expect(AnswerInterpreter.interpret("becuase", card(["because"])).matchType).toBe("none");
    expect(AnswerInterpreter.interpret("becaus", card(["because"])).matchType).toBe("fuzzy");
    expect(AnswerInterpreter.interpret("cap", card(["cat"])).matchType).toBe("none");
  });

  it("reports a miss with the accepted answers", () => {
    const result = AnswerInterpreter.interpret("dog", card(["cat"]));
    expect(result).toMatchObject({ isCorrect: false, matchType: "none", normalizedAnswers: ["cat"], ambiguousWith: [] });
  });
});
