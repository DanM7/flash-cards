/** Shared shapes for the math rules in flashcards.json, and the random draws that follow them. */

export interface NumberRange {
  min: number;
  max: number;
}

export interface WeightedRange extends NumberRange {
  weight: number;
}

/** One range, or several picked between by weight (e.g. 1-digit 30% of the time, 2-digit 70%). */
export type NumberRule = NumberRange | WeightedRange[];

export const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;

export const chance = (probability: number): boolean => Math.random() < probability;

export const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/** Picks one of `options` with probability proportional to its weight. */
export const pickWeighted = <T>(options: readonly T[], weightOf: (option: T) => number): T => {
  const total = options.reduce((sum, option) => sum + weightOf(option), 0);
  const roll = Math.random() * total;
  let reached = 0;
  for (const option of options) {
    reached += weightOf(option);
    if (roll < reached) {
      return option;
    }
  }
  return options[options.length - 1];
};

/** Picks a key of `weights` with probability proportional to its value. */
export const pickKey = <K extends string>(weights: Partial<Record<K, number>>): K =>
  pickWeighted(Object.keys(weights) as K[], (key) => weights[key] as number);

export const drawNumber = (rule: NumberRule): number => {
  const range = Array.isArray(rule) ? pickWeighted(rule, (option) => option.weight) : rule;
  return randomInt(range.min, range.max);
};
