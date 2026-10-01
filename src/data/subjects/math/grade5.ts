import type { Card, DeckInfo, MathDeck, MathOperation } from "../../CardTypes";
import {
  chance,
  drawNumber,
  pick,
  pickKey,
  pickWeighted,
  randomInt,
  shuffle,
  type NumberRange,
  type NumberRule
} from "./rules";

export type Grade5Topic =
  | "multiplication"
  | "division"
  | "fractions"
  | "decimals"
  | "order-of-operations"
  | "mixed";

type SingleTopic = Exclude<Grade5Topic, "mixed">;

type FractionProblem = "add-subtract" | "multiply";
type DecimalProblem = "add-subtract" | "power-of-ten" | "times-whole";

export interface Grade5Rules {
  deckSize: number;
  /** How often each topic comes up in the mixed review. */
  mixed: Partial<Record<SingleTopic, number>>;
  multiplication: {
    /** Sizes of the two factors, picked by weight. */
    shapes: { weight: number; first: NumberRange; second: NumberRange }[];
  };
  division: {
    divisor: NumberRule;
    remainderChance: number;
    quotientMin: number;
    dividendMax: number;
  };
  fractions: {
    problems: Partial<Record<FractionProblem, number>>;
    denominators: number[];
    addChance: number;
    wholeTimesFractionChance: number;
    wholeFactor: NumberRange;
  };
  decimals: {
    problems: Partial<Record<DecimalProblem, number>>;
    /** Number ranges are for the whole-number part; `places` are the decimal places to choose from. */
    addSubtract: { addChance: number; places: number[]; first: NumberRange; second: NumberRange };
    powerOfTen: { multiplyChance: number; powers: number[]; places: number[]; number: NumberRange };
    timesWhole: { places: number[]; decimal: NumberRange; whole: NumberRange };
  };
  orderOfOperations: {
    /** Keyed by the expression's shape; `numbers` gives the range for each letter or helper value. */
    templates: Record<string, { weight: number; numbers: Record<string, NumberRange> }>;
  };
}

interface Distractor {
  kind: string;
  value: string | null;
}

interface Problem {
  prompt: string;
  answer: string;
  hint: string;
  /** One of these is always included when usable. */
  slightlyOff: (string | null)[];
  /** One wrong answer per mistake kind, before filling from leftovers. */
  pool: Distractor[];
  /** Last resort when the pool runs dry. */
  fallback: (string | null)[];
}

const TOPIC_OPERATION: Record<Grade5Topic, MathOperation> = {
  multiplication: "multiplication",
  division: "division",
  fractions: "fractions",
  decimals: "decimal-operations",
  "order-of-operations": "order-of-operations",
  mixed: "mixed"
};

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Whole number with commas. */
const fmt = (value: number): string => value.toLocaleString("en-US");

/** Positive whole number, or null so it gets skipped as a choice. */
const whole = (value: number): string | null =>
  Number.isInteger(value) && value > 0 ? fmt(value) : null;

const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;

/** Positive decimal without trailing zeros, or null. */
const dec = (value: number): string | null => {
  const rounded = round6(value);
  return rounded > 0 ? rounded.toLocaleString("en-US", { maximumFractionDigits: 6 }) : null;
};

/** Simplified fraction or mixed number (e.g. "3/4", "1 1/12", "2"), or null when not positive. */
const frac = (numerator: number, denominator: number): string | null => {
  if (numerator <= 0 || denominator <= 0 || !Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    return null;
  }
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  if (d === 1) {
    return String(n);
  }
  const wholePart = Math.floor(n / d);
  return wholePart > 0 ? `${wholePart} ${n % d}/${d}` : `${n}/${d}`;
};

const reverseDigits = (value: number): number => Number(String(value).split("").reverse().join(""));

/** Swap two neighboring digits that differ, like a copying slip. */
const swapAdjacentDigits = (value: number): number | null => {
  const digits = String(value).split("");
  const spots = digits.map((_, i) => i).filter((i) => i + 1 < digits.length && digits[i] !== digits[i + 1]);
  if (spots.length === 0) {
    return null;
  }
  const i = pick(spots);
  [digits[i], digits[i + 1]] = [digits[i + 1], digits[i]];
  return Number(digits.join(""));
};

const assembleChoices = (problem: Problem): string[] => {
  const used = new Set<string>([problem.answer]);
  const picked: string[] = [];
  const take = (value: string | null | undefined): boolean => {
    if (!value || used.has(value) || picked.length >= 3) {
      return false;
    }
    used.add(value);
    picked.push(value);
    return true;
  };

  shuffle(problem.slightlyOff).some(take);

  const kinds = shuffle([...new Set(problem.pool.map((d) => d.kind))]);
  for (const kind of kinds) {
    shuffle(problem.pool.filter((d) => d.kind === kind)).some((d) => take(d.value));
  }
  shuffle(problem.pool).forEach((d) => take(d.value));
  problem.fallback.forEach(take);

  if (picked.length < 3) {
    throw new Error(`Not enough wrong answers for "${problem.prompt}".`);
  }
  return shuffle([problem.answer, ...picked]);
};

const nudges = (correct: number, format: (value: number) => string | null, steps: number[]) =>
  steps.flatMap((step) => [format(correct + step), format(correct - step)]);

/** Multiply each digit by a 1-digit number and keep only the ones digit (forgot to carry). */
const noCarryProduct = (a: number, b: number): number =>
  Number(
    String(a)
      .split("")
      .map((digit) => String((Number(digit) * b) % 10))
      .join("")
  );

const multiplication = (rules: Grade5Rules): Problem => {
  const shape = pickWeighted(rules.multiplication.shapes, (option) => option.weight);
  const a = drawNumber(shape.first);
  const b = drawNumber(shape.second);
  const correct = a * b;
  const pool: Distractor[] = [
    { kind: "off-by-ten", value: whole(correct * 10) },
    { kind: "digit-swap", value: whole(swapAdjacentDigits(correct) ?? 0) }
  ];
  if (correct % 10 === 0) {
    pool.push({ kind: "off-by-ten", value: whole(correct / 10) });
  }

  let hint: string;
  if (b >= 10) {
    const tens = Math.floor(b / 10);
    const ones = b % 10;
    pool.push(
      { kind: "no-place-value-shift", value: whole(a * ones + a * tens) },
      { kind: "one-partial-product", value: whole(a * tens * 10) },
      { kind: "one-partial-product", value: whole(a * ones) }
    );
    hint =
      ones === 0
        ? `${fmt(a)} × ${b} is the same as ${fmt(a)} × ${tens}, then × 10.`
        : `Break ${b} into ${tens * 10} + ${ones}. ${fmt(a)} × ${tens * 10} = ${fmt(a * tens * 10)}. Now find ${fmt(a)} × ${ones} and add the two partial products.`;
  } else {
    pool.push({ kind: "no-carry", value: whole(noCarryProduct(a, b)) });
    const parts = String(a)
      .split("")
      .map((digit, i, digits) => Number(digit) * 10 ** (digits.length - 1 - i))
      .filter((part) => part > 0);
    hint = `Break ${fmt(a)} into ${parts.map(fmt).join(" + ")}. Start with ${fmt(parts[0])} × ${b} = ${fmt(parts[0] * b)}, then multiply the other parts by ${b} and add.`;
  }

  return {
    prompt: `${fmt(a)} × ${b}`,
    answer: fmt(correct),
    hint,
    slightlyOff: nudges(correct, whole, [10, 100]),
    pool,
    fallback: nudges(correct, whole, [1, 1000, 20, 200])
  };
};

const division = (rules: Grade5Rules): Problem => {
  const { remainderChance, quotientMin, dividendMax } = rules.division;
  const divisor = drawNumber(rules.division.divisor);
  const remainder = chance(remainderChance) ? randomInt(1, divisor - 1) : 0;
  const quotient = randomInt(quotientMin, Math.floor((dividendMax - remainder) / divisor));
  const dividend = divisor * quotient + remainder;

  const qr = (q: number, r: number): string | null => {
    if (!Number.isInteger(q) || q <= 0 || r < 0) {
      return null;
    }
    return r > 0 ? `${fmt(q)} R ${r}` : fmt(q);
  };

  const pool: Distractor[] = [
    { kind: "off-by-ten", value: qr(quotient * 10, remainder) },
    { kind: "off-by-ten", value: qr(Math.floor(quotient / 10), remainder) },
    { kind: "digit-reversal", value: qr(reverseDigits(quotient), remainder) }
  ];
  if (String(quotient).includes("0")) {
    pool.push({ kind: "dropped-zero", value: qr(Number(String(quotient).replace(/0/g, "")), remainder) });
  }
  if (remainder > 0) {
    pool.push(
      { kind: "remainder-too-big", value: qr(quotient - 1, remainder + divisor) },
      { kind: "ignored-remainder", value: qr(quotient, 0) }
    );
  } else {
    pool.push({ kind: "extra-remainder", value: qr(quotient, randomInt(1, divisor - 1)) });
  }

  const slightlyOff = [qr(quotient + 1, remainder), qr(quotient - 1, remainder)];
  if (remainder > 1) {
    slightlyOff.push(qr(quotient, remainder - 1));
  }
  if (remainder > 0 && remainder + 1 < divisor) {
    slightlyOff.push(qr(quotient, remainder + 1));
  }

  const place = 10 ** (String(quotient).length - 1);
  const estimate = Math.floor(quotient / place) * place;
  const left = dividend - divisor * estimate;
  const hint = `Estimate first: ${divisor} × ${fmt(estimate)} = ${fmt(divisor * estimate)}. That leaves ${fmt(left)} — how many more ${divisor}s fit${remainder > 0 ? ", and what's left over" : ""}?`;

  return {
    prompt: `${fmt(dividend)} ÷ ${divisor}`,
    answer: qr(quotient, remainder) as string,
    hint,
    slightlyOff,
    pool,
    fallback: [2, 3, 5, 11].flatMap((step) => [qr(quotient + step, remainder), qr(quotient - step, remainder)])
  };
};

/** Numerator for a proper fraction already in lowest terms. */
const simplifiedNumerator = (denominator: number): number => {
  for (;;) {
    const numerator = randomInt(1, denominator - 1);
    if (gcd(numerator, denominator) === 1) {
      return numerator;
    }
  }
};

const convertStep = (n: number, d: number, lcd: number): string =>
  d === lcd ? `${n}/${d} stays ${n}/${d}` : `${n}/${d} = ${n * (lcd / d)}/${lcd}`;

const fractionAddSubtract = ({ fractions: rules }: Grade5Rules): Problem => {
  const add = chance(rules.addChance);
  for (;;) {
    let b = pick(rules.denominators);
    let d = pick(rules.denominators);
    if (b === d) {
      continue;
    }
    let a = simplifiedNumerator(b);
    let c = simplifiedNumerator(d);
    // Both fractions are in lowest terms with different denominators, so they're never equal
    // and subtracting the smaller from the larger always leaves a positive answer.
    if (!add && a * d < c * b) {
      [a, b, c, d] = [c, d, a, b];
    }
    const lcd = (b * d) / gcd(b, d);
    const scaledA = a * (lcd / b);
    const scaledC = c * (lcd / d);
    const numerator = add ? scaledA + scaledC : scaledA - scaledC;
    const symbol = add ? "+" : "−";
    return {
      prompt: `${a}/${b} ${symbol} ${c}/${d}`,
      answer: frac(numerator, lcd) as string,
      hint: `Use a common denominator of ${lcd}: ${convertStep(a, b, lcd)} and ${convertStep(c, d, lcd)}. Now ${add ? "add" : "subtract"} the numerators, then simplify.`,
      slightlyOff: [frac(numerator + 1, lcd), frac(numerator - 1, lcd)],
      pool: [
        {
          kind: "added-across",
          value: add ? frac(a + c, b + d) : frac(a - c, b - d)
        },
        { kind: "numerators-not-scaled", value: add ? frac(a + c, lcd) : frac(a - c, lcd) },
        {
          kind: "wrong-operation",
          value: add ? frac(Math.abs(scaledA - scaledC), lcd) : frac(scaledA + scaledC, lcd)
        },
        { kind: "wrong-operation", value: frac(a * c, b * d) }
      ],
      fallback: [2, 3, 4].flatMap((step) => [frac(numerator + step, lcd), frac(numerator - step, lcd)])
    };
  }
};

const fractionMultiply = ({ fractions: rules }: Grade5Rules): Problem => {
  const b = pick(rules.denominators);
  const a = simplifiedNumerator(b);
  if (chance(rules.wholeTimesFractionChance)) {
    const n = drawNumber(rules.wholeFactor);
    const numerator = n * a;
    return {
      prompt: `${n} × ${a}/${b}`,
      answer: frac(numerator, b) as string,
      hint: `Multiply the whole number by the numerator and keep the denominator: ${n} × ${a} over ${b}. Then write it as a mixed number if you can.`,
      slightlyOff: [frac(numerator + 1, b), frac(numerator - 1, b)],
      pool: [
        { kind: "multiplied-both", value: frac(numerator, n * b) },
        { kind: "wrong-operation", value: frac(n * b + a, b) },
        { kind: "divided", value: frac(a, n * b) }
      ],
      fallback: [2, 3, 4].flatMap((step) => [frac(numerator + step, b), frac(numerator - step, b)])
    };
  }
  const d = pick(rules.denominators);
  const c = simplifiedNumerator(d);
  const numerator = a * c;
  const denominator = b * d;
  const lcd = (b * d) / gcd(b, d);
  return {
    prompt: `${a}/${b} × ${c}/${d}`,
    answer: frac(numerator, denominator) as string,
    hint: `Multiply the numerators (${a} × ${c}) and the denominators (${b} × ${d}), then simplify.`,
    slightlyOff: [frac(numerator + 1, denominator), frac(numerator - 1, denominator)],
    pool: [
      { kind: "cross-multiplied", value: frac(a * d, b * c) },
      { kind: "wrong-operation", value: frac(a * (lcd / b) + c * (lcd / d), lcd) },
      { kind: "kept-one-denominator", value: frac(numerator, Math.max(b, d)) }
    ],
    fallback: [2, 3, 4].flatMap((step) => [frac(numerator + step, denominator), frac(numerator - step, denominator)])
  };
};

const FRACTION_PROBLEMS: Record<FractionProblem, (rules: Grade5Rules) => Problem> = {
  "add-subtract": fractionAddSubtract,
  multiply: fractionMultiply
};

const fractions = (rules: Grade5Rules): Problem => FRACTION_PROBLEMS[pickKey(rules.fractions.problems)](rules);

/** Random decimal with a whole part in [minWhole, maxWhole] and exactly `places` decimal places. */
const randomDecimal = (minWhole: number, maxWhole: number, places: number): number => {
  const scale = 10 ** places;
  let fraction = randomInt(1, scale - 1);
  while (fraction % 10 === 0) {
    fraction = randomInt(1, scale - 1);
  }
  return round6(randomInt(minWhole, maxWhole) + fraction / scale);
};

const decimalAddSubtract = (all: Grade5Rules): Problem => {
  const rules = all.decimals.addSubtract;
  const add = chance(rules.addChance);
  const placesA = pick(rules.places);
  const placesB = pick(rules.places);
  let a = randomDecimal(rules.first.min, rules.first.max, placesA);
  let b = randomDecimal(rules.second.min, rules.second.max, placesB);
  while (a === b) {
    b = randomDecimal(rules.second.min, rules.second.max, placesB);
  }
  let [pa, pb] = [placesA, placesB];
  if (!add && a <= b) {
    [a, b, pa, pb] = [b, a, pb, pa];
  }
  const correct = round6(add ? a + b : a - b);
  const maxPlaces = Math.max(pa, pb);
  const aText = a.toFixed(pa);
  const bText = b.toFixed(pb);
  const verb = add ? "add" : "subtract";

  // Right-aligning the digits instead of the decimal points shifts the shorter number.
  const [left, right] = pa < pb ? [a / 10, b] : [a, b / 10];
  const misaligned = add ? left + right : left - right;

  let hint: string;
  if (pa === pb) {
    hint = `Line up the decimal points, ${verb} like whole numbers, then bring the decimal point straight down.`;
  } else {
    const [short, shortPlaces] = pa < pb ? [a, pa] : [b, pb];
    hint = `Line up the decimal points. Write ${short.toFixed(shortPlaces)} as ${short.toFixed(maxPlaces)} so both numbers have ${plural(maxPlaces, "decimal place")}, then ${verb}.`;
  }

  return {
    prompt: `${aText} ${add ? "+" : "−"} ${bText}`,
    answer: dec(correct) as string,
    hint,
    slightlyOff: nudges(correct, dec, maxPlaces === 2 ? [0.01, 0.1] : [0.1]),
    pool: [
      { kind: "misaligned-decimal", value: dec(misaligned) },
      { kind: "decimal-shift", value: dec(correct * 10) },
      { kind: "decimal-shift", value: dec(correct / 10) },
      { kind: "wrong-operation", value: dec(add ? Math.abs(a - b) : a + b) }
    ],
    fallback: nudges(correct, dec, [1, 0.2, 2, 0.5])
  };
};

const decimalPowerOfTen = (all: Grade5Rules): Problem => {
  const rules = all.decimals.powerOfTen;
  const power = pick(rules.powers);
  const zeros = Math.round(Math.log10(power));
  const multiply = chance(rules.multiplyChance);
  const a = randomDecimal(rules.number.min, rules.number.max, pick(rules.places));
  const correct = multiply ? a * power : a / power;
  const direction = multiply ? "right" : "left";
  return {
    prompt: `${a} ${multiply ? "×" : "÷"} ${fmt(power)}`,
    answer: dec(correct) as string,
    hint: `${multiply ? "Multiplying" : "Dividing"} by ${fmt(power)} moves the decimal point ${plural(zeros, "place")} to the ${direction}.`,
    slightlyOff: [dec(correct * 10), dec(correct / 10)],
    pool: [
      { kind: "wrong-direction", value: dec(multiply ? a / power : a * power) },
      { kind: "wrong-direction", value: dec(multiply ? a / (power * 10) : a * power * 10) },
      { kind: "two-places-off", value: dec(correct * 100) },
      { kind: "two-places-off", value: dec(correct / 100) }
    ],
    fallback: [dec(correct * 1000), dec(correct / 1000)]
  };
};

const decimalTimesWhole = (all: Grade5Rules): Problem => {
  const rules = all.decimals.timesWhole;
  const places = pick(rules.places);
  const a = randomDecimal(rules.decimal.min, rules.decimal.max, places);
  const n = drawNumber(rules.whole);
  const correct = round6(a * n);
  const scaled = Math.round(a * 10 ** places);
  return {
    prompt: `${a.toFixed(places)} × ${n}`,
    answer: dec(correct) as string,
    hint: `Multiply without the decimal: ${scaled} × ${n} = ${fmt(scaled * n)}. ${a.toFixed(places)} has ${plural(places, "decimal place")}, so the answer does too.`,
    slightlyOff: nudges(correct, dec, places === 2 ? [0.01, 0.1] : [0.1]),
    pool: [
      { kind: "decimal-shift", value: dec(correct * 10) },
      { kind: "decimal-shift", value: dec(correct / 10) },
      { kind: "ignored-decimal", value: dec(scaled * n) },
      { kind: "wrong-operation", value: dec(a + n) }
    ],
    fallback: nudges(correct, dec, [1, 0.2, 2])
  };
};

const DECIMAL_PROBLEMS: Record<DecimalProblem, (rules: Grade5Rules) => Problem> = {
  "add-subtract": decimalAddSubtract,
  "power-of-ten": decimalPowerOfTen,
  "times-whole": decimalTimesWhole
};

const decimals = (rules: Grade5Rules): Problem => DECIMAL_PROBLEMS[pickKey(rules.decimals.problems)](rules);

interface OrderTemplate {
  prompt: string;
  correct: number;
  /** Result of working straight left to right or ignoring parentheses. */
  wrongOrder: number;
  hint: string;
}

/** Draws the named number from the template's ranges. */
type Draw = (name: string) => number;

/** Keys match `orderOfOperations.templates` in flashcards.json. */
const ORDER_TEMPLATES: Record<string, (n: Draw) => OrderTemplate> = {
  "a + b × c": (n) => {
    const [a, b, c] = [n("a"), n("b"), n("c")];
    return {
      prompt: `${a} + ${b} × ${c}`,
      correct: a + b * c,
      wrongOrder: (a + b) * c,
      hint: `Multiply before you add: ${b} × ${c} = ${b * c}.`
    };
  },
  "(a + b) × c": (n) => {
    const [a, b, c] = [n("a"), n("b"), n("c")];
    return {
      prompt: `(${a} + ${b}) × ${c}`,
      correct: (a + b) * c,
      wrongOrder: a + b * c,
      hint: `Parentheses first: ${a} + ${b} = ${a + b}.`
    };
  },
  "a − b × c": (n) => {
    const [b, c] = [n("b"), n("c")];
    const a = b * c + n("leftover");
    return {
      prompt: `${a} − ${b} × ${c}`,
      correct: a - b * c,
      wrongOrder: (a - b) * c,
      hint: `Multiply before you subtract: ${b} × ${c} = ${b * c}.`
    };
  },
  "a × (b − c)": (n) => {
    const c = n("c");
    const [a, b] = [n("a"), c + n("difference")];
    return {
      prompt: `${a} × (${b} − ${c})`,
      correct: a * (b - c),
      wrongOrder: a * b - c,
      hint: `Parentheses first: ${b} − ${c} = ${b - c}.`
    };
  },
  "a + b ÷ c": (n) => {
    const c = n("c");
    const b = c * n("quotient");
    const a = n("a");
    return {
      prompt: `${a} + ${b} ÷ ${c}`,
      correct: a + b / c,
      wrongOrder: (a + b) / c,
      hint: `Divide before you add: ${b} ÷ ${c} = ${b / c}.`
    };
  },
  "(a − b) ÷ c": (n) => {
    const c = n("c");
    const b = n("b");
    const a = b + c * n("quotient");
    return {
      prompt: `(${a} − ${b}) ÷ ${c}`,
      correct: (a - b) / c,
      wrongOrder: a - b / c,
      hint: `Parentheses first: ${a} − ${b} = ${a - b}.`
    };
  },
  "a × b + c × d": (n) => {
    const [a, b, c, d] = [n("a"), n("b"), n("c"), n("d")];
    return {
      prompt: `${a} × ${b} + ${c} × ${d}`,
      correct: a * b + c * d,
      wrongOrder: (a * b + c) * d,
      hint: `Do both multiplications first: ${a} × ${b} = ${a * b} and ${c} × ${d} = ${c * d}.`
    };
  }
};

const orderOfOperations = (rules: Grade5Rules): Problem => {
  const [shape, rule] = pickWeighted(Object.entries(rules.orderOfOperations.templates), ([, t]) => t.weight);
  const build = ORDER_TEMPLATES[shape];
  if (!build) {
    throw new Error(`Unknown order-of-operations template "${shape}".`);
  }
  const template = build((name) => {
    const range = rule.numbers[name];
    if (!range) {
      throw new Error(`Order-of-operations template "${shape}" needs a range for "${name}".`);
    }
    return randomInt(range.min, range.max);
  });
  const { correct } = template;
  return {
    prompt: template.prompt,
    answer: fmt(correct),
    hint: template.hint,
    slightlyOff: nudges(correct, whole, [1, 2]),
    pool: [
      { kind: "wrong-order", value: whole(template.wrongOrder) },
      { kind: "off-by-ten", value: whole(correct + 10) },
      { kind: "off-by-ten", value: whole(correct - 10) },
      { kind: "digit-reversal", value: whole(reverseDigits(correct)) }
    ],
    fallback: nudges(correct, whole, [3, 4, 5, 6])
  };
};

const GENERATORS: Record<SingleTopic, (rules: Grade5Rules) => Problem> = {
  multiplication,
  division,
  fractions,
  decimals,
  "order-of-operations": orderOfOperations
};

const toCard = (problem: Problem): Card => ({
  prompt: problem.prompt,
  answers: [problem.answer],
  choices: assembleChoices(problem),
  hint: problem.hint
});

const generate = (topic: Grade5Topic, rules: Grade5Rules): Problem =>
  GENERATORS[topic === "mixed" ? pickKey(rules.mixed) : topic](rules);

/** Internals exposed only so tests can reach safety nets that random decks never hit. */
export const __testing = { assembleChoices };

export const createGrade5Deck = (topic: Grade5Topic, rules: Grade5Rules, info: DeckInfo): MathDeck => ({
  subject: "math",
  operation: TOPIC_OPERATION[topic],
  grade: info.grade,
  unitLabel: info.unitLabel,
  cards: Array.from({ length: rules.deckSize }, () => toCard(generate(topic, rules)))
});
