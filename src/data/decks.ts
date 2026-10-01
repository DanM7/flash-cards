import type {
  DeckBuild,
  DeckEntry,
  DeckInfo,
  Flashcard,
  FlashcardData,
  Grade,
  GradeSubject,
  InteractionMode,
  PlayText,
  SubjectDeck
} from "./CardTypes";
import { cardsIn, flashcardsIn } from "./fromFlashcards";
import { createDecimalOperationsDeck } from "./subjects/math/decimalOperations";
import { createGrade5Deck } from "./subjects/math/grade5";
import { createWholeNumberDeck } from "./subjects/math/wholeNumberOperations";

/** A playable deck from the flashcards.json catalog. */
export interface DeckOption {
  /** `{grade}-{subject}-{unit}`, unique across the catalog. */
  id: string;
  unit: string;
  grade: number;
  gradeLabel: string;
  /** Key in the catalog's `subjects`. */
  subject: string;
  /** "Unit 1", "Final", ... for decks listed as units. */
  unitName?: string;
  title: string;
  badge: string;
  description: string;
  /** flashcards.json categories the deck draws from. */
  categories: string[];
  interaction: InteractionMode;
  build: DeckBuild;
}

/** One row of a units list; `option` is null for units that are coming soon. */
export interface UnitView {
  label: string;
  title: string;
  option: DeckOption | null;
}

export const subjectLabelFor = (data: FlashcardData, subject: string): string =>
  data.subjects[subject]?.label ?? subject;

/** Color name for a CSS modifier class, or "" when the subject has no color. */
export const colorFor = (data: FlashcardData, subject: string): string => data.subjects[subject]?.color ?? "";

export const gradeFor = (data: FlashcardData, grade: number): Grade | undefined =>
  data.grades.find((entry) => entry.grade === grade);

/** The subject step for grades that pick a subject first; undefined for grades that go straight to their decks. */
export const subjectStepFor = (data: FlashcardData, grade: number): GradeSubject[] | undefined => {
  const entry = gradeFor(data, grade);
  return entry?.pickSubject ? entry.subjects : undefined;
};

const categoriesOf = (build: DeckBuild): string[] =>
  build.type === "cards" ? [build.category] : build.type === "countries" ? build.categories : [];

const deckId = (grade: number, subject: string, unit: string) => `${grade}-${subject}-${unit}`;

const optionsOf = (data: FlashcardData): DeckOption[] =>
  data.grades.flatMap((grade) =>
    grade.subjects.flatMap((entry) => {
      const subjectLabel = subjectLabelFor(data, entry.subject);
      const toOption = (
        deck: Omit<DeckEntry, "title">,
        title: string,
        badge: string,
        unitName?: string
      ): DeckOption => ({
        id: deckId(grade.grade, entry.subject, deck.unit),
        unit: deck.unit,
        grade: grade.grade,
        gradeLabel: grade.label,
        subject: entry.subject,
        unitName,
        title,
        badge,
        description: deck.description,
        categories: categoriesOf(deck.build),
        interaction: deck.interaction ?? "multiple-choice",
        build: deck.build
      });
      return [
        ...(entry.decks ?? []).map((deck) => toOption(deck, deck.title, subjectLabel)),
        ...(entry.units ?? []).flatMap((unit) =>
          unit.deck
            ? [toOption(unit.deck, `${unit.label}: ${unit.title}`, `${subjectLabel} · ${unit.label}`, unit.label)]
            : []
        )
      ];
    })
  );

const optionsCache = new WeakMap<FlashcardData, DeckOption[]>();

/** Every playable deck in the catalog, in catalog order. */
export function deckOptions(data: FlashcardData): DeckOption[] {
  let options = optionsCache.get(data);
  if (!options) {
    options = optionsOf(data);
    optionsCache.set(data, options);
  }
  return options;
}

export function deckDescription(option: DeckOption, flashcards: Flashcard[]): string {
  const count = option.categories.reduce(
    (total, category) => total + flashcardsIn(flashcards, category).length,
    0
  );
  return option.description.replace("{count}", String(count));
}

export function getDecksForGrade(data: FlashcardData, grade: number): DeckOption[] {
  return deckOptions(data).filter((option) => option.grade === grade);
}

export function getDeckOptionById(data: FlashcardData, id: string): DeckOption | null {
  return deckOptions(data).find((option) => option.id === id) ?? null;
}

/** The units list for a grade's subject, or null when the subject lists plain decks. */
export function unitsFor(data: FlashcardData, grade: number, subject: string): UnitView[] | null {
  const units = gradeFor(data, grade)?.subjects.find((entry) => entry.subject === subject)?.units;
  return units
    ? units.map((unit) => ({
        label: unit.label,
        title: unit.title,
        option: unit.deck ? getDeckOptionById(data, deckId(grade, subject, unit.deck.unit)) : null
      }))
    : null;
}

/** Finds a deck from `?grade=&subject=&unit=`; a blank subject matches any subject in the grade. */
export function findDeckByUnit(data: FlashcardData, grade: string, subject: string, unit: string): DeckOption | null {
  const code = unit.trim().toLowerCase();
  if (!code) {
    return null;
  }
  return (
    deckOptions(data).find(
      (option) =>
        String(option.grade) === grade && (!subject || option.subject === subject) && option.unit === code
    ) ?? null
  );
}

/** Units show their own label on the play screen; plain decks show the grade, e.g. "2nd Grade · Addition". */
const unitLabelOf = (option: DeckOption): string =>
  option.unitName ? option.title : `${option.gradeLabel} · ${option.title}`;

const buildDeck = async (option: DeckOption, data: FlashcardData): Promise<SubjectDeck> => {
  const { build } = option;
  const info: DeckInfo = { grade: option.grade, unitLabel: unitLabelOf(option) };
  switch (build.type) {
    case "cards":
      return {
        subject: build.deckType ?? option.subject,
        grade: option.grade,
        ...(option.unitName ? { unitLabel: option.title } : {}),
        ...(build.operation ? { operation: build.operation } : {}),
        cards: cardsIn(data.cards, build.category, data.multipleChoice.wrongChoices)
      } as SubjectDeck;
    case "wholeNumberOperations":
      return createWholeNumberDeck(build.topic, data.mathRules.wholeNumberOperations, info);
    case "grade5":
      return createGrade5Deck(build.topic, data.mathRules.grade5, info);
    case "decimalOperations":
      // The play screen already titles these "Decimal Operations", so the label is just the unit.
      return createDecimalOperationsDeck(data.mathRules.decimalOperations, {
        grade: option.grade,
        unitLabel: option.unitName ?? info.unitLabel
      });
    case "countries":
      // The map data is large, so it only loads once a geography deck starts.
      return (await import("./subjects/geography/countriesDeck")).createCountriesDeck(
        data.cards,
        build.categories,
        info,
        { wrongChoices: data.multipleChoice.wrongChoices, nearbyCountries: data.geography.nearbyCountries }
      );
    default:
      throw new Error(`Unknown deck type "${(build as { type: string }).type}".`);
  }
};

/** Play screen wording for a deck: the defaults, overridden by its subject, then (for math) its operation. */
export const playTextFor = (data: FlashcardData, deck: SubjectDeck): PlayText => ({
  ...data.playText.default,
  ...data.playText[deck.subject],
  ...(deck.subject === "math" ? data.playText[deck.operation] : undefined)
});

/** A fresh deck each play: written cards from flashcards.json, or generated from its math rules. */
export async function resolveDeck(option: DeckOption, data: FlashcardData): Promise<SubjectDeck> {
  const deck = await buildDeck(option, data);
  if (deck.cards.length === 0) {
    throw new Error(`Deck "${option.id}" has no cards.`);
  }
  return deck;
}
