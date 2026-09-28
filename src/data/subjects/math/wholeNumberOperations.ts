import type { Card, MathDeck, MathOperation } from "../../CardTypes";

type Op = "add" | "sub" | "mul" | "div";

export type WholeNumberGrade = 2 | 3;
export type WholeNumberTopic = Op | "mixed";

interface Problem {
  a: number;
  b: number;
  op: Op;
}

export const WHOLE_NUMBER_DECK_SIZE = 20;

const OPS: Op[] = ["add", "sub", "mul", "div"];

const OP_SYMBOL: Record<Op, string> = { add: "+", sub: "−", mul: "×", div: "÷" };

const TOPIC_LABEL: Record<WholeNumberTopic, string> = {
  add: "Addition",
  sub: "Subtraction",
  mul: "Multiplication",
  div: "Division",
  mixed: "All Four Operations"
};

const TOPIC_OPERATION: Record<WholeNumberTopic, MathOperation> = {
  add: "addition",
  sub: "subtraction",
  mul: "multiplication",
  div: "division",
  mixed: "mixed"
};

/** Allowed range for operands, answers, and wrong answers. */
const RANGE: Record<WholeNumberGrade, { min: number; max: number }> = {
  2: { min: 0, max: 100 },
  3: { min: -1000, max: 1000 }
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
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

const formatNumber = (value: number): string => (value < 0 ? `−${Math.abs(value)}` : String(value));

const buildPrompt = (problem: Problem): string => {
  const right = problem.b < 0 ? `(${formatNumber(problem.b)})` : formatNumber(problem.b);
  return `${formatNumber(problem.a)} ${OP_SYMBOL[problem.op]} ${right}`;
};

const inRange = (value: number, grade: WholeNumberGrade): boolean =>
  Number.isInteger(value) && value >= RANGE[grade].min && value <= RANGE[grade].max;

/** 1- or 2-digit number, leaning toward 2 digits. */
const oneOrTwoDigits = (): number => (Math.random() < 0.3 ? randomInt(1, 9) : randomInt(10, 99));

/** 1- to 3-digit number. */
const upToThreeDigits = (): number => {
  const roll = Math.random();
  if (roll < 0.2) {
    return randomInt(1, 9);
  }
  if (roll < 0.6) {
    return randomInt(10, 99);
  }
  return randomInt(100, 999);
};

const maybeNegative = (value: number): number => (Math.random() < 0.3 ? -value : value);

const generateGrade2 = (op: "add" | "sub"): Problem => {
  for (;;) {
    let a = oneOrTwoDigits();
    let b = oneOrTwoDigits();
    if (op === "add") {
      if (a + b <= 100) {
        return { a, b, op };
      }
      continue;
    }
    if (a < b) {
      [a, b] = [b, a];
    }
    return { a, b, op };
  }
};

const generateGrade3 = (op: Op): Problem => {
  for (;;) {
    let problem: Problem;
    if (op === "add" || op === "sub") {
      problem = { a: maybeNegative(upToThreeDigits()), b: maybeNegative(upToThreeDigits()), op };
    } else if (op === "mul") {
      problem = { a: maybeNegative(randomInt(2, 12)), b: maybeNegative(randomInt(2, 12)), op };
    } else {
      const divisor = maybeNegative(randomInt(2, 12));
      const quotient = maybeNegative(randomInt(1, 12));
      problem = { a: divisor * quotient, b: divisor, op };
    }
    if (inRange(problem.a, 3) && inRange(problem.b, 3) && inRange(compute(problem.a, problem.b, op), 3)) {
      return problem;
    }
  }
};

type DistractorKind =
  | "slightly-off"
  | "off-by-ten"
  | "wrong-operation"
  | "sign-flip"
  | "digit-reversal"
  | "no-carry-or-borrow";

interface Distractor {
  kind: DistractorKind;
  value: number;
}

const reverseDigits = (value: number): number => {
  const reversed = Number(String(Math.abs(value)).split("").reverse().join(""));
  return value < 0 ? -reversed : reversed;
};

/** Add without carrying, or subtract the smaller digit from the larger in each column. */
const noCarryOrBorrow = (problem: Problem): number | null => {
  if ((problem.op !== "add" && problem.op !== "sub") || problem.a < 0 || problem.b < 0) {
    return null;
  }
  const width = Math.max(String(problem.a).length, String(problem.b).length);
  const digitsA = String(problem.a).padStart(width, "0");
  const digitsB = String(problem.b).padStart(width, "0");
  let result = "";
  for (let i = 0; i < width; i += 1) {
    const da = Number(digitsA[i]);
    const db = Number(digitsB[i]);
    result += problem.op === "add" ? String((da + db) % 10) : String(Math.abs(da - db));
  }
  return Number(result);
};

const buildChoices = (problem: Problem, correct: number, grade: WholeNumberGrade): string[] => {
  const used = new Set<number>([correct]);
  const picked: number[] = [];

  const isUsable = (value: number): boolean => inRange(value, grade) && !used.has(value);
  const take = (value: number) => {
    used.add(value);
    picked.push(value);
  };

  const slightlyOff = shuffle([correct + 1, correct - 1, correct + 2, correct - 2]).find(isUsable);
  if (slightlyOff != null) {
    take(slightlyOff);
  }

  const wrongOps = grade === 2 ? OPS.filter((op) => op === "add" || op === "sub") : OPS;
  const pool: Distractor[] = [
    { kind: "off-by-ten", value: correct + 10 },
    { kind: "off-by-ten", value: correct - 10 },
    ...wrongOps
      .filter((op) => op !== problem.op)
      .map((op) => ({ kind: "wrong-operation" as const, value: compute(problem.a, problem.b, op) })),
    { kind: "digit-reversal", value: reverseDigits(correct) }
  ];
  if (grade === 3 && correct !== 0) {
    pool.push({ kind: "sign-flip", value: -correct });
  }
  const noCarry = noCarryOrBorrow(problem);
  if (noCarry != null) {
    pool.push({ kind: "no-carry-or-borrow", value: noCarry });
  }

  // One per kind first so answers come from different mistakes, then fill from leftovers.
  const kinds = shuffle([...new Set(pool.map((d) => d.kind))]);
  for (const kind of kinds) {
    if (picked.length >= 3) {
      break;
    }
    const option = shuffle(pool.filter((d) => d.kind === kind)).find((d) => isUsable(d.value));
    if (option) {
      take(option.value);
    }
  }
  for (const distractor of shuffle(pool)) {
    if (picked.length >= 3) {
      break;
    }
    if (isUsable(distractor.value)) {
      take(distractor.value);
    }
  }
  for (let step = 3; picked.length < 3 && step < 50; step += 1) {
    for (const value of [correct + step, correct - step]) {
      if (picked.length < 3 && isUsable(value)) {
        take(value);
      }
    }
  }

  return shuffle([correct, ...picked]).map(formatNumber);
};

const toCard = (problem: Problem, grade: WholeNumberGrade): Card => {
  const correct = compute(problem.a, problem.b, problem.op);
  return {
    prompt: buildPrompt(problem),
    answers: [formatNumber(correct)],
    choices: buildChoices(problem, correct, grade)
  };
};

const generateProblem = (grade: WholeNumberGrade, topic: WholeNumberTopic): Problem => {
  const op = topic === "mixed" ? pick(grade === 2 ? (["add", "sub"] as const) : OPS) : topic;
  if (grade === 2) {
    if (op !== "add" && op !== "sub") {
      throw new Error(`2nd grade only supports addition and subtraction (got ${op}).`);
    }
    return generateGrade2(op);
  }
  return generateGrade3(op);
};

export const createWholeNumberDeck = (grade: WholeNumberGrade, topic: WholeNumberTopic): MathDeck => ({
  subject: "math",
  operation: TOPIC_OPERATION[topic],
  grade,
  unitLabel: `${grade === 2 ? "2nd" : "3rd"} Grade · ${TOPIC_LABEL[topic]}`,
  cards: Array.from({ length: WHOLE_NUMBER_DECK_SIZE }, () => toCard(generateProblem(grade, topic), grade))
});
