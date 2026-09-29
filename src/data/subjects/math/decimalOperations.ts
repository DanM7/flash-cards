import type { Card, MathDeck } from "../../CardTypes";

type Op = "add" | "sub" | "mul" | "div";

type UnitKind = "none" | "money" | "inches" | "miles" | "pounds" | "liters";

interface ProblemSpec {
  a: number;
  b: number;
  op: Op;
  unit: UnitKind;
}

export const DECK_SIZE = 50;
export const ROUND_SIZE = 10;
export const TOTAL_ROUNDS = DECK_SIZE / ROUND_SIZE;

const OPS: Op[] = ["add", "sub", "mul", "div"];
const UNIT_CHOICES: Exclude<UnitKind, "none">[] = [
  "money",
  "inches",
  "miles",
  "pounds",
  "liters"
];

const UNIT_SUFFIX: Record<Exclude<UnitKind, "none" | "money">, string> = {
  inches: "inches",
  miles: "miles",
  pounds: "pounds",
  liters: "liters"
};

const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T;

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const roundNice = (value: number): number => {
  const abs = Math.abs(value);
  if (abs >= 100) {
    return Math.round(value * 10) / 10;
  }
  if (abs >= 10) {
    return Math.round(value * 100) / 100;
  }
  return Math.round(value * 1000) / 1000;
};

const stripTrailingZeros = (value: number): string => {
  const rounded = roundNice(value);
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return String(rounded)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
};

const decimalPlaces = (value: number): number => {
  const text = stripTrailingZeros(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
};

/** Units stay on answers only for add/sub; mul/div are bare numbers. */
const answerUnit = (spec: ProblemSpec): UnitKind =>
  spec.op === "add" || spec.op === "sub" ? spec.unit : "none";

const formatValue = (value: number, unit: UnitKind): string => {
  if (unit === "money") {
    const abs = (Math.round(Math.abs(value) * 100) / 100).toFixed(2);
    return value < 0 ? `-$${abs}` : `$${abs}`;
  }
  const n = stripTrailingZeros(value);
  if (unit === "none") {
    return n;
  }
  return `${n} ${UNIT_SUFFIX[unit]}`;
};

const compute = (a: number, b: number, op: Op): number => {
  switch (op) {
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    case "div":
      return a / b;
  }
};

const opSymbol = (op: Op): string => {
  switch (op) {
    case "add":
      return "+";
    case "sub":
      return "−";
    case "mul":
      return "×";
    case "div":
      return "÷";
  }
};

const buildPrompt = (spec: ProblemSpec): string => {
  if (spec.op === "mul" || spec.op === "div") {
    return `${stripTrailingZeros(spec.a)} ${opSymbol(spec.op)} ${stripTrailingZeros(spec.b)}`;
  }
  return `${formatValue(spec.a, spec.unit)} ${opSymbol(spec.op)} ${formatValue(spec.b, spec.unit)}`;
};

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const roundTo = (value: number, places: number): number => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

type DistractorKind =
  | "slightly-off"
  | "decimal-shift"
  | "wrong-operation"
  | "misaligned-decimal"
  | "no-carry-or-borrow"
  | "partial-products"
  | "reversed-division";

interface Distractor {
  kind: DistractorKind;
  value: number;
}

/** Off by 1 or by 10%, rounded to look like a real answer. */
const slightlyOffDistractors = (correct: number): Distractor[] => {
  const places = Math.min(2, Math.max(1, decimalPlaces(correct)));
  return [correct + 1, correct - 1, correct * 1.1, correct * 0.9].map((value) => ({
    kind: "slightly-off" as const,
    value: roundTo(value, places)
  }));
};

const decimalShiftDistractors = (correct: number): Distractor[] =>
  [correct * 10, correct / 10].map((value) => ({ kind: "decimal-shift" as const, value }));

const wrongOperationDistractors = (spec: ProblemSpec): Distractor[] =>
  OPS.filter((candidate) => candidate !== spec.op).map((candidate) => ({
    kind: "wrong-operation" as const,
    value: compute(spec.a, spec.b, candidate)
  }));

/** Add/sub with the digits right-aligned instead of lining up the decimal points. */
const misalignedDecimalDistractors = (spec: ProblemSpec): Distractor[] => {
  if (spec.op !== "add" && spec.op !== "sub") {
    return [];
  }
  const placesA = decimalPlaces(spec.a);
  const placesB = decimalPlaces(spec.b);
  if (placesA === placesB) {
    return [];
  }
  const a = placesA < placesB ? spec.a / 10 ** (placesB - placesA) : spec.a;
  const b = placesB < placesA ? spec.b / 10 ** (placesA - placesB) : spec.b;
  return [{ kind: "misaligned-decimal", value: compute(a, b, spec.op) }];
};

/** Add without carrying, or subtract the smaller digit from the larger in each column. */
const noCarryOrBorrowDistractors = (spec: ProblemSpec): Distractor[] => {
  if (spec.op !== "add" && spec.op !== "sub") {
    return [];
  }
  const places = Math.max(decimalPlaces(spec.a), decimalPlaces(spec.b));
  const scale = 10 ** places;
  const width = Math.max(
    String(Math.round(spec.a * scale)).length,
    String(Math.round(spec.b * scale)).length
  );
  const digitsA = String(Math.round(spec.a * scale)).padStart(width, "0");
  const digitsB = String(Math.round(spec.b * scale)).padStart(width, "0");
  let result = "";
  for (let i = 0; i < width; i += 1) {
    const da = Number(digitsA[i]);
    const db = Number(digitsB[i]);
    result += spec.op === "add" ? String((da + db) % 10) : String(Math.abs(da - db));
  }
  return [{ kind: "no-carry-or-borrow", value: Number(result) / scale }];
};

/** Multiply whole parts and decimal parts separately, then add (e.g. 2.5 × 3.2 → 6 + 0.1). */
const partialProductDistractors = (spec: ProblemSpec): Distractor[] => {
  if (spec.op !== "mul") {
    return [];
  }
  const wholeA = Math.trunc(spec.a);
  const wholeB = Math.trunc(spec.b);
  const fracA = spec.a - wholeA;
  const fracB = spec.b - wholeB;
  return [{ kind: "partial-products", value: wholeA * wholeB + fracA * fracB }];
};

const reversedDivisionDistractors = (spec: ProblemSpec): Distractor[] =>
  spec.op === "div" ? [{ kind: "reversed-division", value: spec.b / spec.a }] : [];

const buildChoices = (spec: ProblemSpec, correct: number): string[] => {
  const unit = answerUnit(spec);
  const correctText = formatValue(correct, unit);
  const used = new Set<string>([correctText]);
  const picked: number[] = [];

  const isUsable = (value: number): boolean => {
    const rounded = roundNice(value);
    if (!Number.isFinite(rounded) || rounded <= 0 || rounded > 1000) {
      return false;
    }
    return !used.has(formatValue(rounded, unit));
  };

  const take = (value: number) => {
    const rounded = roundNice(value);
    used.add(formatValue(rounded, unit));
    picked.push(rounded);
  };

  const slightlyOff = shuffle(slightlyOffDistractors(correct)).find((d) => isUsable(d.value));
  if (slightlyOff) {
    take(slightlyOff.value);
  }

  const byKind = new Map<DistractorKind, Distractor[]>();
  for (const distractor of [
    ...decimalShiftDistractors(correct),
    ...wrongOperationDistractors(spec),
    ...misalignedDecimalDistractors(spec),
    ...noCarryOrBorrowDistractors(spec),
    ...partialProductDistractors(spec),
    ...reversedDivisionDistractors(spec)
  ]) {
    byKind.set(distractor.kind, [...(byKind.get(distractor.kind) ?? []), distractor]);
  }

  // One per kind first so answers come from different mistakes, then fill from leftovers.
  for (const [, options] of shuffle([...byKind.entries()])) {
    if (picked.length >= 3) {
      break;
    }
    const option = shuffle(options).find((d) => isUsable(d.value));
    if (option) {
      take(option.value);
    }
  }
  for (const distractor of shuffle([...byKind.values()].flat())) {
    if (picked.length >= 3) {
      break;
    }
    if (isUsable(distractor.value)) {
      take(distractor.value);
    }
  }

  for (let step = 1; picked.length < 3 && step < 20; step += 1) {
    const nudge = correct + step * 0.1;
    if (isUsable(nudge)) {
      take(nudge);
    }
  }

  return shuffle([correct, ...picked]).map((value) => formatValue(value, unit));
};

/** Prefer a trailing .0 on whole numbers in borrow/compensation hints (e.g. 3.0). */
const formatFriendly = (value: number): string => {
  const rounded = roundNice(value);
  if (Number.isInteger(rounded)) {
    return `${rounded}.0`;
  }
  return stripTrailingZeros(rounded);
};

const buildBorrowAddHint = (spec: ProblemSpec): string | null => {
  const prompt = buildPrompt(spec);
  const tryBorrow = (from: "b" | "a", target: number): string | null => {
    if (from === "b") {
      const borrow = roundNice(target - spec.a);
      if (borrow <= 0 || borrow >= spec.b) {
        return null;
      }
      const newA = roundNice(spec.a + borrow);
      const newB = roundNice(spec.b - borrow);
      return `${prompt} is also like ${formatFriendly(newA)} + ${formatFriendly(newB)} if we borrow ${stripTrailingZeros(borrow)} from ${stripTrailingZeros(spec.b)} and give it to ${stripTrailingZeros(spec.a)}`;
    }
    const borrow = roundNice(target - spec.b);
    if (borrow <= 0 || borrow >= spec.a) {
      return null;
    }
    const newB = roundNice(spec.b + borrow);
    const newA = roundNice(spec.a - borrow);
    return `${prompt} is also like ${formatFriendly(newA)} + ${formatFriendly(newB)} if we borrow ${stripTrailingZeros(borrow)} from ${stripTrailingZeros(spec.a)} and give it to ${stripTrailingZeros(spec.b)}`;
  };

  return (
    tryBorrow("b", Math.ceil(spec.a)) ??
    tryBorrow("b", Math.floor(spec.a) + 1) ??
    tryBorrow("b", Math.ceil(spec.a * 2) / 2) ??
    tryBorrow("a", Math.ceil(spec.b)) ??
    tryBorrow("a", Math.ceil(spec.b * 2) / 2)
  );
};

const buildCompensateSubHint = (spec: ProblemSpec): string | null => {
  const prompt = buildPrompt(spec);
  const targetB = Math.ceil(spec.b);
  const bump = roundNice(targetB - spec.b);
  if (bump <= 0) {
    return null;
  }
  const newA = roundNice(spec.a + bump);
  const newB = roundNice(spec.b + bump);
  return `${prompt} is also like ${formatFriendly(newA)} − ${formatFriendly(newB)} if we add ${stripTrailingZeros(bump)} to both numbers`;
};

const buildHint = (spec: ProblemSpec): string => {
  const aText = stripTrailingZeros(spec.a);
  const bText = stripTrailingZeros(spec.b);

  if (spec.op === "div") {
    const divisorPlaces = decimalPlaces(spec.b);
    if (divisorPlaces === 0) {
      return `${aText} ÷ ${bText}: ask “${bText} × X = ${aText}?” What number times ${bText} makes ${aText}?`;
    }
    const factor = 10 ** divisorPlaces;
    const aScaled = stripTrailingZeros(roundNice(spec.a * factor));
    const bScaled = stripTrailingZeros(roundNice(spec.b * factor));
    return `${aText} ÷ ${bText} is like ${aScaled} ÷ ${bScaled}, and ${bScaled} × X = ${aScaled}`;
  }

  if (spec.op === "mul") {
    const places = decimalPlaces(spec.a) + decimalPlaces(spec.b);
    const aWhole = Math.round(spec.a * 10 ** decimalPlaces(spec.a));
    const bWhole = Math.round(spec.b * 10 ** decimalPlaces(spec.b));
    if (places === 0) {
      return `Multiply ${aText} × ${bText} as whole numbers.`;
    }
    return `Ignore decimals first: think ${aWhole} × ${bWhole}. Then place ${places} decimal digit${places === 1 ? "" : "s"} in the answer (total from both factors).`;
  }

  if (spec.op === "add") {
    return (
      buildBorrowAddHint(spec) ??
      `Line up the decimal points (ones under ones, tenths under tenths), then add ${buildPrompt(spec)}.`
    );
  }

  return (
    buildCompensateSubHint(spec) ??
    `Line up the decimal points (ones under ones, tenths under tenths), then subtract ${buildPrompt(spec)}.`
  );
};

/** Small decimal with 1–2 places (never a whole number after formatting). */
const randomDecimal = (maxWhole: number, places: 1 | 2): number => {
  const scale = 10 ** places;
  const min = places === 1 ? 1 : 1; // at least .1 or .01
  const max = maxWhole * scale;
  let value = randomInt(min, max) / scale;
  if (decimalPlaces(value) === 0) {
    value = roundNice(value + (places === 1 ? 0.5 : 0.25));
  }
  return roundNice(value);
};

const randomWhole = (min: number, max: number): number => randomInt(min, max);

const randomOperand = (options: { mustBeDecimal: boolean; money: boolean; maxWhole: number }): number => {
  if (options.mustBeDecimal || Math.random() < 0.55) {
    const places: 1 | 2 = options.money || Math.random() < 0.35 ? 2 : 1;
    return randomDecimal(options.maxWhole, places);
  }
  return randomWhole(1, Math.max(1, options.maxWhole));
};

/** Also rejects NaN and Infinity, since neither passes the range check. */
const isReasonableAnswer = (value: number): boolean => {
  const abs = Math.abs(value);
  return abs <= 100 && (abs >= 0.01 || abs === 0);
};

const chooseUnit = (op: Op): UnitKind => {
  // Units only appear on add/sub prompts; mul/div drop them.
  if (op !== "add" && op !== "sub") {
    return "none";
  }
  return Math.random() < 0.5 ? "none" : pick(UNIT_CHOICES);
};

const generateProblem = (): ProblemSpec => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const op = pick(OPS);
    const unit = chooseUnit(op);
    const money = unit === "money";

    // At least one operand is always a decimal, since randomDecimal never returns a whole number.
    const bothDecimal = Math.random() < 0.4;
    const decimalOnA = bothDecimal || Math.random() < 0.5;

    let a = randomOperand({
      mustBeDecimal: decimalOnA,
      money,
      maxWhole: op === "mul" ? 6 : money ? 12 : 9
    });
    let b = randomOperand({
      mustBeDecimal: bothDecimal || !decimalOnA,
      money,
      maxWhole: op === "mul" ? 6 : op === "div" ? 8 : money ? 12 : 9
    });

    if (op === "sub" && a < b) {
      [a, b] = [b, a];
    }

    if (op === "div") {
      // Prefer cleaner quotients: rebuild dividend from divisor × small quotient.
      if (Math.random() < 0.65) {
        const quotient = randomOperand({
          mustBeDecimal: decimalPlaces(b) === 0,
          money: false,
          maxWhole: 8
        });
        a = roundNice(b * quotient);
        if (decimalPlaces(a) === 0 && decimalPlaces(b) === 0) {
          b = randomDecimal(5, 1);
          a = roundNice(b * quotient);
        }
      }
    }

    const correct = roundNice(compute(a, b, op));
    if (!isReasonableAnswer(correct) || (decimalPlaces(a) === 0 && decimalPlaces(b) === 0)) {
      continue;
    }

    return { a: roundNice(a), b: roundNice(b), op, unit };
  }

  // Safe fallback — always has a decimal.
  return { a: 2.5, b: 1.75, op: "add", unit: "none" };
};

const toCard = (spec: ProblemSpec): Card => {
  if (decimalPlaces(spec.a) === 0 && decimalPlaces(spec.b) === 0) {
    throw new Error(
      `Decimal deck problem must include a decimal operand: ${spec.a} ${spec.op} ${spec.b}`
    );
  }
  const correct = roundNice(compute(spec.a, spec.b, spec.op));
  const unit = answerUnit(spec);
  const answer = formatValue(correct, unit);
  return {
    prompt: buildPrompt(spec),
    answers: [answer, stripTrailingZeros(correct)],
    choices: buildChoices(spec, correct),
    hint: buildHint(spec)
  };
};

/** Internals exposed only so tests can reach safety nets that random decks almost never hit. */
export const __testing = { formatValue, buildChoices, buildHint, toCard };

export const createDecimalOperationsDeck = (): MathDeck => {
  const cards: Card[] = [];
  for (let i = 0; i < DECK_SIZE; i += 1) {
    cards.push(toCard(generateProblem()));
  }
  return {
    subject: "math",
    operation: "decimal-operations",
    grade: 6,
    unitLabel: "Unit 1",
    cards
  };
};
