import { describe, expect, it } from "vitest";
import { drawNumber, pickKey, pickWeighted } from "../../src/data/subjects/math/rules";
import { queueRandom } from "../helpers/random";

describe("math rule draws", () => {
  it("draws from a single range", () => {
    queueRandom([0, 0.9999]);
    expect(drawNumber({ min: 3, max: 7 })).toBe(3);
    expect(drawNumber({ min: 3, max: 7 })).toBe(7);
  });

  it("picks between ranges by weight", () => {
    const rule = [
      { min: 1, max: 9, weight: 1 },
      { min: 10, max: 99, weight: 3 }
    ];
    // 0.2 × 4 = 0.8 falls in the first quarter; 0.3 × 4 = 1.2 falls past it.
    queueRandom([0.2, 0, 0.3, 0]);
    expect(drawNumber(rule)).toBe(1);
    expect(drawNumber(rule)).toBe(10);
  });

  it("picks keys by weight, skipping ones weighted zero", () => {
    queueRandom([0, 0.99]);
    expect(pickKey({ never: 0, sometimes: 1, often: 3 })).toBe("sometimes");
    expect(pickKey({ never: 0, sometimes: 1, often: 3 })).toBe("often");
  });

  it("falls back to the last option when every weight is zero", () => {
    queueRandom([0.5]);
    expect(pickWeighted(["a", "b"], () => 0)).toBe("b");
  });
});
