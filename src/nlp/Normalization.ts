const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export class Normalization {
  /**
   * "7" → "seven", "42" → "forty two", up to "one hundred"; null for anything else.
   * Lets spoken math answers match ("seven" for 7). It works, but no deck uses it right now since math
   * went multiple-choice only; kept in case spoken math comes back.
   */
  static spellNumber(input: string): string | null {
    if (!/^\d{1,3}$/.test(input)) {
      return null;
    }
    const value = Number(input);
    if (value < 20) {
      return ONES[value];
    }
    if (value < 100) {
      return value % 10 === 0 ? TENS[value / 10] : `${TENS[Math.floor(value / 10)]} ${ONES[value % 10]}`;
    }
    return value === 100 ? "one hundred" : null;
  }

  static normalizeText(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ");
  }

  static tokenize(input: string): string[] {
    const normalized = this.normalizeText(input);
    return normalized.length > 0 ? normalized.split(" ") : [];
  }

  static normalizeAnswers(answers: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const answer of answers) {
      const value = this.normalizeText(answer);
      if (!value || seen.has(value)) {
        continue;
      }
      seen.add(value);
      normalized.push(value);
    }

    return normalized;
  }
}
