import type { Continent } from "./subjects/geography/atlas";
import type { DecimalOperationsRules } from "./subjects/math/decimalOperations";
import type { Grade5Rules, Grade5Topic } from "./subjects/math/grade5";
import type { WholeNumberRules, WholeNumberTopic } from "./subjects/math/wholeNumberOperations";

export type SubjectType =
  | "sight-words"
  | "math"
  | "science"
  | "french"
  | "geography"
  | "vocabulary"
  | "custom";

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
  /**
   * Show a map with this country (ISO numeric id) highlighted instead of the prompt text,
   * zoomed out to `continent` at the widest.
   */
  map?: { countryId: string; continent?: Continent };
  /** BCP 47 language of the prompt when it isn't the file's default `language`, e.g. "fr-FR". */
  lang?: string;
  acceptableTranscripts?: string[];
  ambiguousTranscripts?: string[];
}

/** One entry in flashcards.json. */
export interface Flashcard {
  question: string;
  answer: string;
  /** Which deck the card belongs to, e.g. "science-cells-unit1". */
  category?: string;
  /** Other answers that also count, typed or spoken (e.g. "five" for "5"). */
  acceptedAnswers?: string[];
  /** Multiple-choice options, including the answer. With more than four, three wrong ones are picked each play. */
  choices?: string[];
  hint?: string;
  /** ISO numeric id of the country to highlight on a map. */
  countryId?: string;
  /** The map zooms out to this continent at the widest. */
  continent?: Continent;
  /** BCP 47 language of the question when it isn't the file's default `language`, e.g. "fr-FR". */
  lang?: string;
  /** Extra words speech recognition may hear for the answer (e.g. "four" for "for"). */
  acceptableTranscripts?: string[];
}

/** Limits and mix for the generated math decks (number sizes, operations, how often each kind comes up). */
export interface MathRules {
  wholeNumberOperations: WholeNumberRules;
  grade5: Grade5Rules;
  decimalOperations: DecimalOperationsRules;
}

/** A subject's name and tile color, the same in every grade. */
export interface SubjectInfo {
  label: string;
  /** red, green, purple, blue, yellow, or orange. */
  color: string;
}

/** How a deck gets its cards each time it's played. */
export type DeckBuild =
  | {
      /** Written cards from one flashcards.json category. */
      type: "cards";
      category: string;
      /** Which play screen labels and cues to use; defaults to the subject (e.g. "sight-words" for reading). */
      deckType?: SubjectType;
      /** Required for math decks. */
      operation?: MathOperation;
      /** Read each prompt aloud instead of showing it (multiple-choice decks). */
      listen?: boolean;
    }
  | { type: "wholeNumberOperations"; topic: WholeNumberTopic }
  | { type: "grade5"; topic: Grade5Topic }
  | { type: "decimalOperations" }
  /** Map cards for the countries in these categories, with wrong answers from nearby countries. */
  | { type: "countries"; categories: string[] };

export interface DeckEntry {
  /**
   * Stable `?unit=` code, unique within a grade and subject. Never holds the unit
   * number, so units can be renumbered without breaking saved links.
   */
  unit: string;
  title: string;
  /** "{count}" becomes the number of flashcards the deck draws from. */
  description: string;
  /** Defaults to multiple choice. */
  interaction?: InteractionMode;
  build: DeckBuild;
}

/** A numbered unit (or a section like a final review); units without a deck are listed as coming soon. */
export interface UnitEntry {
  /** "Unit 1", "Final", ... */
  label: string;
  title: string;
  deck?: Omit<DeckEntry, "title">;
}

export interface GradeSubject {
  /** Key in `subjects`. */
  subject: string;
  /** Shown on the grade tile. */
  summary: string;
  /** Shown on the subject tile; falls back to the summary. */
  blurb?: string;
  /** Unavailable subjects show as coming soon. */
  available?: boolean;
  /** Listed as decks. */
  decks?: DeckEntry[];
  /** Listed as units, each with a "Unit N" badge. */
  units?: UnitEntry[];
}

export interface Grade {
  grade: number;
  label: string;
  /** sky, violet, teal, rose, amber, or any subject color. */
  color: string;
  /** Show a subject step before the decks. */
  pickSubject?: boolean;
  subjects: GradeSubject[];
}

export interface MultipleChoiceSettings {
  /** Time limit for each question in Timed mode. */
  secondsPerQuestion: number;
  /** The timer turns red with this much time left. */
  lowTimeSeconds: number;
  /** Cards per round; an encouragement break comes between rounds. */
  roundSize: number;
  /** Wrong answers shown with each written or map card. */
  wrongChoices: number;
  scoring: {
    firstTry: number;
    /** Taken off for each wrong pick. */
    perWrongPick: number;
    /** Taken off for opening the hint. */
    hint: number;
    /** A card answered right never scores less than this. */
    minimum: number;
  };
  /** One is picked at random for each break. */
  encouragement: string[];
  /** Voice for decks whose prompts are read aloud. */
  speech: SpeechSettings;
}

export interface SpeechSettings {
  /** 1 is normal speed. */
  rate: number;
}

export interface TypingAndVoiceSettings {
  /** Right answers between encouragement breaks. */
  cardsBeforeBreak: number;
  breakSeconds: number;
  encouragement: string[];
}

/** Play screen wording. `playText` sets it per deck type, layered default → subject → math operation. */
export interface PlayText {
  title: string;
  /** "word" or "problem", as in "wait until the word appears". */
  promptName: string;
  /** Shown above the prompt on multiple-choice cards. */
  choiceCue: string;
  /** Shown above the Play again button on cards that are read aloud. */
  listenCue: string;
  /** Shown above the prompt on typing and voice cards. */
  typingCue: string;
  finishedTitle: string;
  choiceFinished: string;
  typingFinished: string;
}

/** Everything in flashcards.json. */
export interface FlashcardData {
  /** BCP 47 language every flashcard is in unless it sets its own `lang`. */
  language: string;
  home: { tagline: string; intro: string };
  multipleChoice: MultipleChoiceSettings;
  typingAndVoice: TypingAndVoiceSettings;
  geography: {
    /** Wrong answers on a map card come from this many of the closest countries in the deck. */
    nearbyCountries: number;
  };
  playText: { default: PlayText } & Record<string, Partial<PlayText>>;
  subjects: Record<string, SubjectInfo>;
  grades: Grade[];
  mathRules: MathRules;
  cards: Flashcard[];
}

/** Grade and screen label every built deck gets from its catalog entry. */
export interface DeckInfo {
  grade: number;
  unitLabel: string;
}

interface BaseDeck {
  subject: SubjectType;
  cards: Card[];
  /** Prompts are read aloud instead of shown. */
  listen?: boolean;
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

export interface GeographyDeck extends BaseDeck {
  subject: "geography";
  grade: number;
  unitLabel: string;
}

export interface VocabularyDeck extends BaseDeck {
  subject: "vocabulary";
  topic?: string;
  grade?: number;
}

export interface CustomDeck extends BaseDeck {
  subject: "custom";
}

export type SubjectDeck =
  | SightWordsDeck
  | MathDeck
  | ScienceDeck
  | FrenchDeck
  | GeographyDeck
  | VocabularyDeck
  | CustomDeck;
