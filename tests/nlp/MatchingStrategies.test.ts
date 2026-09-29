import { describe, expect, it } from "vitest";
import { MatchingStrategies } from "../../src/nlp/MatchingStrategies";

describe("MatchingStrategies", () => {
  it("matches exactly after normalizing", () => {
    expect(MatchingStrategies.exactMatch("CAT", ["cat"])).toBe(true);
    expect(MatchingStrategies.exactMatch("cap", ["cat"])).toBe(false);
  });

  it("matches when either side contains the other", () => {
    expect(MatchingStrategies.includesMatch("the big cat", ["cat"])).toBe(true);
    expect(MatchingStrategies.includesMatch("cat", ["the big cat"])).toBe(true);
    expect(MatchingStrategies.includesMatch("dog", ["cat"])).toBe(false);
    expect(MatchingStrategies.includesMatch("", ["cat"])).toBe(false);
  });

  it("computes edit distance", () => {
    expect(MatchingStrategies.fuzzyDistance("kitten", "sitting")).toBe(3);
    expect(MatchingStrategies.fuzzyDistance("", "abc")).toBe(3);
    expect(MatchingStrategies.fuzzyDistance("same", "same")).toBe(0);
  });

  it("fuzzy matches within the threshold", () => {
    expect(MatchingStrategies.fuzzyMatch("helo", ["hello"])).toBe(true);
    expect(MatchingStrategies.fuzzyMatch("help", ["hello"], 0)).toBe(false);
  });
});
