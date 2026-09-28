export type SubjectType = "sight-words" | "math" | "science" | "french" | "vocabulary" | "custom";

export type MathOperation =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "mixed"
  | "fractions"
  | "decimal-operations"
  | "order-of-operations";

export type InteractionMode = "voice-or-type" | "multiple-choice";

export interface Card {
  prompt: string;
  answers: string[];
  /** When present, play as multiple choice (exactly one of these matches answers[0]). */
  choices?: string[];
  /** Optional help text shown when the learner opens Hint. */
  hint?: string;
  acceptableTranscripts?: string[];
  ambiguousTranscripts?: string[];
}

interface BaseDeck {
  subject: SubjectType;
  cards: Card[];
}

export interface SightWordsDeck extends BaseDeck {
  subject: "sight-words";
  grade: number;
}

export interface MathDeck extends BaseDeck {
  subject: "math";
  operation: MathOperation;
  grade?: number;
  unitLabel?: string;
}

export interface ScienceDeck extends BaseDeck {
  subject: "science";
  grade: number;
  unitLabel: string;
}

export interface FrenchDeck extends BaseDeck {
  subject: "french";
  grade: number;
  unitLabel: string;
}

export interface VocabularyDeck extends BaseDeck {
  subject: "vocabulary";
  topic: string;
}

export interface CustomDeck extends BaseDeck {
  subject: "custom";
}

export type SubjectDeck =
  | SightWordsDeck
  | MathDeck
  | ScienceDeck
  | FrenchDeck
  | VocabularyDeck
  | CustomDeck;
