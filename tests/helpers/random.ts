import { vi } from "vitest";

/** Small deterministic PRNG so randomized generators give the same cards on every run. */
export const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seedRandom = (seed: number) => vi.spyOn(Math, "random").mockImplementation(mulberry32(seed));

/** Math.random returns these values in order, then falls back to the seeded generator. */
export const queueRandom = (values: number[], seed = 1) => {
  const fallback = mulberry32(seed);
  const queue = [...values];
  return vi.spyOn(Math, "random").mockImplementation(() => (queue.length > 0 ? (queue.shift() as number) : fallback()));
};
