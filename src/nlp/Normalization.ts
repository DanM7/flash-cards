export class Normalization {
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
