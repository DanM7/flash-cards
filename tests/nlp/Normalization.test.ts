import { describe, expect, it } from "vitest";
import { Normalization } from "../../src/nlp/Normalization";

describe("Normalization", () => {
  it("lowercases, trims, and turns punctuation into single spaces", () => {
    expect(Normalization.normalizeText("  Hello, World!!  ")).toBe("hello world ");
    expect(Normalization.normalizeText("A.M.")).toBe("a m ");
  });

  it("tokenizes into words, or nothing for blank input", () => {
    expect(Normalization.tokenize("One  two")).toEqual(["one", "two"]);
    expect(Normalization.tokenize("")).toEqual([]);
  });

  it("normalizes answers, dropping blanks and duplicates", () => {
    expect(Normalization.normalizeAnswers(["Cat", "cat", "", "Dog"])).toEqual(["cat", "dog"]);
  });

  it("spells whole numbers up to one hundred", () => {
    expect(["0", "7", "13", "20", "42", "99", "100"].map(Normalization.spellNumber)).toEqual([
      "zero",
      "seven",
      "thirteen",
      "twenty",
      "forty two",
      "ninety nine",
      "one hundred"
    ]);
    expect(["101", "3.5", "-2", "seven", ""].map(Normalization.spellNumber)).toEqual([null, null, null, null, null]);
  });
});
