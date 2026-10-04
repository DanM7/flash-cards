import type { Card, DeckInfo, MathDeck, MathOperation } from "../../CardTypes";
import { chance, drawNumber, pick, shuffle, type NumberRange, type NumberRule } from "./rules";

type Op = "add" | "sub" | "mul" | "div";

export type WholeNumberTopic = Op | "mixed";

interface OperandRule {
  /** Both numbers are drawn from this, unless `second` is set. */
  operand: NumberRule;
  /** The second number is drawn from this instead (e.g. a 2-digit number times a 1-digit one). */
  second?: NumberRule;
  /** Swap so the larger number comes first (subtraction that never goes below zero). */
  largerFirst?: boolean;
}

interface DivisionRule {
  divisor: NumberRule;
  /** The dividend is divisor × quotient, so division always comes out even. */
  quotient: NumberRule;
  /** Largest dividend allowed, when it should stay smaller than the grade's range (e.g. 2-digit ÷ 1-digit). */
  dividendMax?: number;
}

export interface WholeNumberGradeRules {
  /** Allowed range for numbers, answers, and wrong answers. */
  range: NumberRange;
  /** Chance each number is made negative. */
  negativeChance: number;
  /** The operations this grade practices; mixed decks draw from all of them. */
  operations: { add?: OperandRule; sub?: OperandRule; mul?: OperandRule; div?: DivisionRule };
}

export interface WholeNumberRules {
  deckSize: number;
  grades: Record<string, WholeNumberGradeRules>;
}

interface Problem {
  a: number;
  b: number;
  op: Op;
}

const OPS: Op[] = ["add", "sub", "mul", "div"];

const OP_SYMBOL: Record<Op, string> = { add: "+", sub: "−", mul: "×", div: "÷" };

const TOPIC_OPERATION: Record<WholeNumberTopic, MathOperation> = {
  add: "addition",
  sub: "subtraction",
  mul: "multiplication",
  div: "division",
  mixed: "mixed"
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

const inRange = (value: number, rules: WholeNumberGradeRules): boolean =>
  Number.isInteger(value) && value >= rules.range.min && value <= rules.range.max;

const gradeOps = (rules: WholeNumberGradeRules): Op[] => OPS.filter((op) => rules.operations[op]);

const maybeNegative = (value: number, rules: WholeNumberGradeRules): number =>
  rules.negativeChance > 0 && chance(rules.negativeChance) ? -value : value;

const signedDraw = (rule: NumberRule, rules: WholeNumberGradeRules): number =>
  maybeNegative(drawNumber(rule), rules);

const drawProblem = (op: Op, rules: WholeNumberGradeRules): Problem => {
  if (op === "div") {
    const rule = rules.operations.div as DivisionRule;
    const divisor = signedDraw(rule.divisor, rules);
    const quotient = signedDraw(rule.quotient, rules);
    return { a: divisor * quotient, b: divisor, op };
  }
  const rule = rules.operations[op] as OperandRule;
  let a = signedDraw(rule.operand, rules);
  let b = signedDraw(rule.second ?? rule.operand, rules);
  if (rule.largerFirst && a < b) {
    [a, b] = [b, a];
  }
  return { a, b, op };
};

const fits = (problem: Problem, rules: WholeNumberGradeRules): boolean => {
  const dividendMax = problem.op === "div" ? (rules.operations.div as DivisionRule).dividendMax : undefined;
  return (
    inRange(problem.a, rules) &&
    inRange(problem.b, rules) &&
    inRange(compute(problem.a, problem.b, problem.op), rules) &&
    (dividendMax == null || Math.abs(problem.a) <= dividendMax)
  );
};

const generateProblem = (op: Op, rules: WholeNumberGradeRules): Problem => {
  for (;;) {
    const problem = drawProblem(op, rules);
    if (fits(problem, rules)) {
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

const buildChoices = (problem: Problem, correct: number, rules: WholeNumberGradeRules): string[] => {
  const used = new Set<number>([correct]);
  const picked: number[] = [];

  const isUsable = (value: number): boolean => inRange(value, rules) && !used.has(value);
  const take = (value: number) => {
    used.add(value);
    picked.push(value);
  };

  const slightlyOff = shuffle([correct + 1, correct - 1, correct + 2, correct - 2]).find(isUsable);
  if (slightlyOff != null) {
    take(slightlyOff);
  }

  const pool: Distractor[] = [
    { kind: "off-by-ten", value: correct + 10 },
    { kind: "off-by-ten", value: correct - 10 },
    ...gradeOps(rules)
      .filter((op) => op !== problem.op)
      .map((op) => ({ kind: "wrong-operation" as const, value: compute(problem.a, problem.b, op) })),
    { kind: "digit-reversal", value: reverseDigits(correct) }
  ];
  if (rules.range.min < 0 && correct !== 0) {
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

const toCard = (problem: Problem, rules: WholeNumberGradeRules): Card => {
  const correct = compute(problem.a, problem.b, problem.op);
  return {
    prompt: buildPrompt(problem),
    answers: [formatNumber(correct)],
    choices: buildChoices(problem, correct, rules)
  };
};

export const createWholeNumberDeck = (topic: WholeNumberTopic, rules: WholeNumberRules, info: DeckInfo): MathDeck => {
  const { grade, unitLabel } = info;
  const gradeRules = rules.grades[grade];
  if (!gradeRules) {
    throw new Error(`No math rules for grade ${grade}.`);
  }
  const ops = gradeOps(gradeRules);
  if (topic !== "mixed" && !ops.includes(topic)) {
    throw new Error(`Grade ${grade} math rules don't include ${topic}.`);
  }
  return {
    subject: "math",
    operation: TOPIC_OPERATION[topic],
    grade,
    unitLabel,
    cards: Array.from({ length: rules.deckSize }, () =>
      toCard(generateProblem(topic === "mixed" ? pick(ops) : topic, gradeRules), gradeRules)
    )
  };
};
