import type { FrenchColors } from "./subjects/french/colors";
import type { Continent } from "./subjects/geography/atlas";
import type { Geography } from "./subjects/geography/countriesDeck";
import type { UnitedStatesGeography } from "./subjects/geography/states";
import type { CalculationPracticeRules, CalculationTopic } from "./subjects/math/calculationPractice";
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

/** A grade number like 6, or a name for a track that isn't a school grade, like "computer-science". */
export type GradeKey = number | string;

export type MathOperation =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "mixed"
  | "fractions"
  | "decimal-operations"
  | "order-of-operations"
  | "calculation-practice";

export type InteractionMode = "voice-or-type" | "multiple-choice";

export interface Card {
  prompt: string;
  answers: string[];
  /** When present, play as multiple choice (exactly one of these matches answers[0]). */
  choices?: string[];
  /** Optional help text shown when the learner opens Hint. */
  hint?: string;
  /**
   * Show a map instead of the prompt text: a country (ISO numeric id) highlighted and zoomed out to
   * `continent` at the widest, or a U.S. state (by name) with its `capital` ([longitude, latitude]) marked.
   */
  map?: { countryId: string; continent?: Continent } | { state: string; capital?: [number, number] };
  /** BCP 47 language of the prompt when it isn't the default `appSettings.language`, e.g. "fr-FR". */
  lang?: string;
  acceptableTranscripts?: string[];
  ambiguousTranscripts?: string[];
}

/** A written card's answer, or its answer with extras. Without an `answer`, the answer is the question itself. */
export type CardEntry =
  | string
  | {
      answer?: string;
      /** Other answers that also count, typed or spoken. */
      acceptedAnswers?: string[];
      /** Wrong answers for this card alone (like look-alike words), used instead of the set's shared pool. */
      incorrectAnswers?: string[];
      hint?: string;
    };

/** Written cards that play together, keyed by question (or by answer, with `show: "value"`). */
export interface CardSet {
  /** BCP 47 language of the questions when it isn't the default `appSettings.language`, e.g. "fr-FR". */
  lang?: string;
  /**
   * Which side of a plain `"key": "value"` card is shown; the other side is the answer. Defaults to "key".
   * Term → definition sets use "value" to show the definition and ask for the term.
   * Cards written as objects always show their key.
   */
  show?: "key" | "value";
  /** Wrong answers to mix in with the other cards' answers. */
  additionalIncorrectAnswers?: string[];
  cards: Record<string, CardEntry>;
}

/** Limits and mix for the generated math decks (number sizes, operations, how often each kind comes up). */
export interface MathRules {
  wholeNumberOperations: WholeNumberRules;
  grade5: Grade5Rules;
  decimalOperations: DecimalOperationsRules;
  calculationPractice: CalculationPracticeRules;
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
      /** Written cards from the deck subject's `cardSets` in `subjectData`. */
      type: "cards";
      /** Keys in that subject's `cardSets`. Each set's cards draw wrong answers only from that set. */
      sets: string[];
      /** Which play screen labels and cues to use; defaults to the subject (e.g. "vocabulary" for reading). */
      deckType?: SubjectType;
      /** Required for math decks. */
      operation?: MathOperation;
      /** Read each prompt aloud instead of showing it (multiple-choice decks). */
      listen?: boolean;
    }
  | { type: "wholeNumberOperations"; topic: WholeNumberTopic }
  | { type: "grade5"; topic: Grade5Topic }
  | { type: "decimalOperations" }
  /** Simplifying fractions, greatest common factors, and least common multiples; every topic mixed when left out. */
  | { type: "calculationPractice"; topic?: CalculationTopic }
  /** The grade's list in `subjectData.reading.sightWords`. */
  | { type: "sightWords" }
  /** Three cards per color in `subjectData.french.colors`. */
  | { type: "frenchColors" }
  /** Map cards for the countries in these `subjectData.geography.worldRegions` (every region when left out). */
  | { type: "countries"; regions?: string[] }
  /** Map cards for the `subjectData.geography.unitedStates` in these regions (every state when left out). */
  | { type: "states"; regions?: string[] }
  /** Capital cards for the same states, each with its capital marked on the map. */
  | { type: "stateCapitals"; regions?: string[] };

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

/**
 * A unit, or a section like a final review. Units without a deck are listed as coming soon, and can
 * be written as just their title.
 */
export type UnitEntry =
  | string
  | {
      /** "Final" and the like; numbered units leave it out and count themselves ("Unit 1", "Unit 2", ...). */
      label?: string;
      title: string;
      deck?: Omit<DeckEntry, "title">;
    };

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
  grade: GradeKey;
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

/** How the app behaves and what it says, apart from any one subject's content. */
export interface AppSettings {
  /** BCP 47 language every flashcard is in unless it sets its own `lang`. */
  language: string;
  home: { tagline: string; intro: string };
  multipleChoice: MultipleChoiceSettings;
  typingAndVoice: TypingAndVoiceSettings;
  playText: { default: PlayText } & Record<string, Partial<PlayText>>;
}

/** What the menus offer: subject names and colors, and each grade's subjects and decks. */
export interface Catalog {
  subjects: Record<string, SubjectInfo>;
  grades: Grade[];
}

/** One subject's content, keyed like `catalog.subjects`. Any subject can have written card sets. */
export interface SubjectContent {
  cardSets?: Record<string, CardSet>;
}

export interface SubjectData {
  [subject: string]: SubjectContent;
  math: SubjectContent & MathRules;
  /** `sightWords` maps a grade to its sight words. */
  reading: SubjectContent & { sightWords: Record<string, string[]> };
  french: SubjectContent & { colors: FrenchColors };
  geography: SubjectContent & Geography & UnitedStatesGeography;
}

/** Everything in flashcards.json. */
export interface FlashcardData {
  appSettings: AppSettings;
  catalog: Catalog;
  subjectData: SubjectData;
}

/** Grade and screen label every built deck gets from its catalog entry. */
export interface DeckInfo {
  grade: GradeKey;
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
  grade: GradeKey;
}

export interface MathDeck extends BaseDeck {
  subject: "math";
  operation: MathOperation;
  grade?: GradeKey;
  unitLabel?: string;
}

export interface ScienceDeck extends BaseDeck {
  subject: "science";
  grade: GradeKey;
  unitLabel: string;
}

export interface FrenchDeck extends BaseDeck {
  subject: "french";
  grade: GradeKey;
  unitLabel: string;
}

export interface GeographyDeck extends BaseDeck {
  subject: "geography";
  grade: GradeKey;
  unitLabel: string;
}

export interface VocabularyDeck extends BaseDeck {
  subject: "vocabulary";
  topic?: string;
  grade?: GradeKey;
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
