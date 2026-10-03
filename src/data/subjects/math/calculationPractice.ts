import type { Card, DeckInfo, MathDeck } from "../../CardTypes";
import { drawNumber, pick, pickKey, shuffle, type NumberRule } from "./rules";

export type CalculationTopic = "simplify" | "gcf" | "lcm";

export interface CalculationPracticeRules {
  deckSize: number;
  /** How often each kind of problem comes up when a deck mixes them. */
  topics: Partial<Record<CalculationTopic, number>>;
  /** A simplest-form fraction with a denominator from `denominator`, scaled up by `commonFactor`. */
  simplify: { denominator: NumberRule; commonFactor: NumberRule };
  /** `factor` times two numbers from `multiplier` that share no factor, so `factor` is the answer. */
  gcf: { factor: NumberRule; multiplier: NumberRule };
  /** Two different numbers from `number`. */
  lcm: { number: NumberRule };
}

interface Problem {
  prompt: string;
  answer: string;
  hint: string;
  /** The most telling mistake; one of these is always shown when there is one. */
  preferred: string[];
  others: string[];
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

const factorsOf = (value: number): number[] =>
  Array.from({ length: value }, (_, i) => i + 1).filter((factor) => value % factor === 0);

const drawUntil = <T>(draw: () => T, ok: (value: T) => boolean, what: string): T => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = draw();
    if (ok(value)) {
      return value;
    }
  }
  throw new Error(`The calculation practice rules can't make ${what}.`);
};

const fraction = (numerator: number, denominator: number) => `${numerator}/${denominator}`;

const simplify = ({ simplify: rules }: CalculationPracticeRules): Problem => {
  const d = drawUntil(() => drawNumber(rules.denominator), (value) => value >= 2, "a fraction");
  const n = pick(Array.from({ length: d - 1 }, (_, i) => i + 1).filter((value) => gcd(value, d) === 1));
  const k = drawUntil(() => drawNumber(rules.commonFactor), (value) => value >= 2, "a fraction to simplify");
  const top = n * k;
  const bottom = d * k;
  const isFraction = (numerator: number, denominator: number) =>
    numerator > 0 && denominator > 1 && numerator !== denominator;
  const candidates = (pairs: [number, number][]) =>
    pairs.filter(([numerator, denominator]) => isFraction(numerator, denominator)).map(([a, b]) => fraction(a, b));
  return {
    prompt: `Simplify ${fraction(top, bottom)}`,
    answer: fraction(n, d),
    hint: `Find the greatest common factor of ${top} and ${bottom}, then divide both by it.`,
    // Divided by a common factor, but not the greatest one.
    preferred: candidates(
      factorsOf(k)
        .filter((factor) => factor > 1 && factor < k)
        .map((factor): [number, number] => [top / factor, bottom / factor])
    ),
    others: candidates([
      [n, bottom],
      [top, d],
      [n + 1, d],
      [n - 1, d],
      [n, d + 1],
      [n, d - 1],
      [d, n],
      [n, d + 2],
      [n, d + 3]
    ])
  };
};

const greatestCommonFactor = ({ gcf: rules }: CalculationPracticeRules): Problem => {
  const g = drawNumber(rules.factor);
  const [m1, m2] = drawUntil(
    () => [drawNumber(rules.multiplier), drawNumber(rules.multiplier)].sort((x, y) => x - y),
    ([x, y]) => x !== y && gcd(x, y) === 1,
    "two numbers for a greatest common factor"
  );
  const a = g * m1;
  const b = g * m2;
  return {
    prompt: `Greatest common factor of ${a} and ${b}`,
    answer: String(g),
    hint: `List the factors of ${a} and of ${b}. The biggest number on both lists is the answer.`,
    // A factor they share, but not the greatest one.
    preferred: factorsOf(g)
      .filter((factor) => factor < g)
      .map(String),
    others: [lcm(a, b), a, g + 1, g - 1, g + 2, g * 2].filter((value) => value > 0).map(String)
  };
};

const leastCommonMultiple = ({ lcm: rules }: CalculationPracticeRules): Problem => {
  const [a, b] = drawUntil(
    () => [drawNumber(rules.number), drawNumber(rules.number)].sort((x, y) => x - y),
    ([x, y]) => x !== y && x > 0,
    "two numbers for a least common multiple"
  );
  const answer = lcm(a, b);
  return {
    prompt: `Least common multiple of ${a} and ${b}`,
    answer: String(answer),
    hint: `Count by ${b}s (${b}, ${b * 2}, ${b * 3}, …) until you reach a number ${a} also goes into.`,
    // A common multiple, but not the least one.
    preferred: [answer * 2, a * b].filter((value) => value !== answer).map(String),
    others: [answer + b, answer + a, answer - 1, answer + 1, gcd(a, b)].filter((value) => value > 1).map(String)
  };
};

const GENERATORS: Record<CalculationTopic, (rules: CalculationPracticeRules) => Problem> = {
  simplify,
  gcf: greatestCommonFactor,
  lcm: leastCommonMultiple
};

const toCard = (problem: Problem): Card => {
  const wrong: string[] = [];
  for (const value of [...shuffle(problem.preferred).slice(0, 1), ...shuffle(problem.others)]) {
    if (wrong.length < 3 && value !== problem.answer && !wrong.includes(value)) {
      wrong.push(value);
    }
  }
  return {
    prompt: problem.prompt,
    answers: [problem.answer],
    choices: shuffle([problem.answer, ...wrong]),
    hint: problem.hint
  };
};

/** Simplifying fractions, greatest common factors, and least common multiples; one topic, or all mixed. */
export const createCalculationPracticeDeck = (
  rules: CalculationPracticeRules,
  info: DeckInfo,
  topic?: CalculationTopic
): MathDeck => ({
  subject: "math",
  operation: "calculation-practice",
  grade: info.grade,
  unitLabel: info.unitLabel,
  cards: Array.from({ length: rules.deckSize }, () => toCard(GENERATORS[topic ?? pickKey(rules.topics)](rules)))
});
