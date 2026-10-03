import type { Card } from "../data/CardTypes";
import { MatchingStrategies } from "./MatchingStrategies";
import { Normalization } from "./Normalization";

export type MatchType = "exact" | "includes" | "fuzzy" | "ambiguous" | "none";

export interface AnswerInterpretation {
  isCorrect: boolean;
  matchType: MatchType;
  normalizedInput: string;
  normalizedAnswers: string[];
  ambiguousWith?: string[];
}

export class AnswerInterpreter {
  private static readonly confusionMap: Record<string, string[]> = {
    a: ["hey"],
    all: ["call"],
    am: ["a.m.", "a m"],
    to: ["two", "too"],
    for: ["four"],
    one: ["won"],
    no: ["know"],
    by: ["buy", "bye"]
  };
  private static readonly ambiguousMap: Record<string, string[]> = {
    an: ["and"],
    and: ["an"]
  };

  private static expandedAnswers(card: Card): string[] {
    const answers = [...card.answers];

    if (card.acceptableTranscripts?.length) {
      answers.push(...card.acceptableTranscripts);
    }

    for (const answer of card.answers) {
      const normalized = Normalization.normalizeText(answer);
      const confusions = this.confusionMap[normalized];
      if (confusions?.length) {
        answers.push(...confusions);
      }
      const spelled = Normalization.spellNumber(normalized);
      if (spelled) {
        answers.push(spelled);
      }
    }

    return answers;
  }

  private static fuzzyThreshold(answers: string[]): number {
    const shortAnswerExists = answers.some((answer) => answer.length <= 3);
    return shortAnswerExists ? 0 : 1;
  }

  private static expandedAmbiguous(card: Card): string[] {
    const ambiguous = [...(card.ambiguousTranscripts ?? [])];

    for (const answer of card.answers) {
      const normalized = Normalization.normalizeText(answer);
      const mapped = this.ambiguousMap[normalized];
      if (mapped?.length) {
        ambiguous.push(...mapped);
      }
    }

    return Normalization.normalizeAnswers(ambiguous);
  }

  static interpret(input: string, card: Card): AnswerInterpretation {
    const normalizedInput = Normalization.normalizeText(input);
    const normalizedAnswers = Normalization.normalizeAnswers(this.expandedAnswers(card));
    const normalizedAmbiguous = this.expandedAmbiguous(card);
    const allowIncludesMatch =
      normalizedInput.includes(" ") || normalizedAnswers.some((answer) => answer.includes(" "));

    if (normalizedAmbiguous.includes(normalizedInput)) {
      return {
        isCorrect: false,
        matchType: "ambiguous",
        normalizedInput,
        normalizedAnswers,
        ambiguousWith: normalizedAmbiguous
      };
    }

    if (MatchingStrategies.exactMatch(normalizedInput, normalizedAnswers)) {
      return {
        isCorrect: true,
        matchType: "exact",
        normalizedInput,
        normalizedAnswers
      };
    }

    if (allowIncludesMatch && MatchingStrategies.includesMatch(normalizedInput, normalizedAnswers)) {
      return {
        isCorrect: true,
        matchType: "includes",
        normalizedInput,
        normalizedAnswers
      };
    }

    if (
      MatchingStrategies.fuzzyMatch(
        normalizedInput,
        normalizedAnswers,
        this.fuzzyThreshold(normalizedAnswers)
      )
    ) {
      return {
        isCorrect: true,
        matchType: "fuzzy",
        normalizedInput,
        normalizedAnswers
      };
    }

    return {
      isCorrect: false,
      matchType: "none",
      normalizedInput,
      normalizedAnswers,
      ambiguousWith: normalizedAmbiguous
    };
  }
}
