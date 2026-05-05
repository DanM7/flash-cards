import { Normalization } from "./Normalization";

export class MatchingStrategies {
  static exactMatch(candidate: string, expected: string[]): boolean {
    const normalizedCandidate = Normalization.normalizeText(candidate);
    const normalizedExpected = Normalization.normalizeAnswers(expected);
    return normalizedExpected.includes(normalizedCandidate);
  }

  static includesMatch(candidate: string, expected: string[]): boolean {
    const normalizedCandidate = Normalization.normalizeText(candidate);
    if (!normalizedCandidate) {
      return false;
    }

    const normalizedExpected = Normalization.normalizeAnswers(expected);
    return normalizedExpected.some(
      (answer) =>
        normalizedCandidate.includes(answer) || answer.includes(normalizedCandidate)
    );
  }

  static fuzzyDistance(a: string, b: string): number {
    const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
      Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i += 1) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= b.length; j += 1) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[a.length][b.length];
  }

  static fuzzyMatch(candidate: string, expected: string[], threshold = 1): boolean {
    const normalizedCandidate = Normalization.normalizeText(candidate);
    const normalizedExpected = Normalization.normalizeAnswers(expected);

    return normalizedExpected.some(
      (answer) => this.fuzzyDistance(normalizedCandidate, answer) <= threshold
    );
  }
}
