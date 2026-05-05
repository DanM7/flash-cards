export type SubjectType = "sight-words" | "math" | "vocabulary" | "custom";

export interface Card {
  prompt: string;
  answers: string[];
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
  operation: "addition" | "subtraction" | "multiplication";
}

export interface VocabularyDeck extends BaseDeck {
  subject: "vocabulary";
  topic: string;
}

export interface CustomDeck extends BaseDeck {
  subject: "custom";
}

export type SubjectDeck = SightWordsDeck | MathDeck | VocabularyDeck | CustomDeck;
