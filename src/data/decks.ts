import type {
  CardSet,
  DeckBuild,
  DeckEntry,
  DeckInfo,
  FlashcardData,
  Grade,
  GradeKey,
  GradeSubject,
  InteractionMode,
  PlayText,
  SubjectDeck,
  UnitEntry
} from "./CardTypes";
import { setCards, setSize } from "./cardSets";
import { createFrenchColorsDeck } from "./subjects/french/colors";
import { statesIn } from "./subjects/geography/states";
import { createCalculationPracticeDeck } from "./subjects/math/calculationPractice";
import { createDecimalOperationsDeck } from "./subjects/math/decimalOperations";
import { createGrade5Deck } from "./subjects/math/grade5";
import { createWholeNumberDeck } from "./subjects/math/wholeNumberOperations";

/** A playable deck from the flashcards.json catalog. */
export interface DeckOption {
  /** `{grade}-{subject}-{unit}`, unique across the catalog. */
  id: string;
  unit: string;
  grade: GradeKey;
  gradeLabel: string;
  /** Key in the catalog's `subjects`. */
  subject: string;
  /** "Unit 1", "Final", ... for decks listed as units. */
  unitName?: string;
  title: string;
  badge: string;
  description: string;
  interaction: InteractionMode;
  build: DeckBuild;
}

/** One row of a units list; `option` is null for units that are coming soon. */
export interface UnitView {
  label: string;
  title: string;
  option: DeckOption | null;
}

/** A unit with its label worked out: "Unit 1", "Unit 2", ... unless it names its own. */
interface LabeledUnit {
  label: string;
  title: string;
  deck?: Omit<DeckEntry, "title">;
}

const labeled = (units: UnitEntry[]): LabeledUnit[] => {
  let number = 0;
  return units.map((unit) => {
    const entry = typeof unit === "string" ? { title: unit } : unit;
    if (entry.label) {
      return { ...entry, label: entry.label };
    }
    number += 1;
    return { ...entry, label: `Unit ${number}` };
  });
};

export const subjectLabelFor = (data: FlashcardData, subject: string): string =>
  data.catalog.subjects[subject]?.label ?? subject;

/** Color name for a CSS modifier class, or "" when the subject has no color. */
export const colorFor = (data: FlashcardData, subject: string): string => data.catalog.subjects[subject]?.color ?? "";

export const gradeFor = (data: FlashcardData, grade: GradeKey): Grade | undefined =>
  data.catalog.grades.find((entry) => entry.grade === grade);

/** The subject step for grades that pick a subject first; undefined for grades that go straight to their decks. */
export const subjectStepFor = (data: FlashcardData, grade: GradeKey): GradeSubject[] | undefined => {
  const entry = gradeFor(data, grade);
  return entry?.pickSubject ? entry.subjects : undefined;
};

const deckId = (grade: GradeKey, subject: string, unit: string) => `${grade}-${subject}-${unit}`;

const optionsOf = (data: FlashcardData): DeckOption[] =>
  data.catalog.grades.flatMap((grade) =>
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
        interaction: entry.subject === "math" ? "multiple-choice" : (deck.interaction ?? "multiple-choice"),
        build: deck.build
      });
      return [
        ...(entry.decks ?? []).map((deck) => toOption(deck, deck.title, subjectLabel)),
        ...labeled(entry.units ?? []).flatMap((unit) =>
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

/** A written card set from the deck subject's `cardSets`, if it has one by that key. */
const cardSetFor = (data: FlashcardData, option: DeckOption, key: string): CardSet | undefined =>
  data.subjectData[option.subject]?.cardSets?.[key];

/** How many cards a deck of written cards, words, colors, countries, or states holds; 0 for generated math. */
export function cardCount(option: DeckOption, data: FlashcardData): number {
  const { build } = option;
  switch (build.type) {
    case "cards":
      return build.sets.reduce((total, key) => {
        const set = cardSetFor(data, option, key);
        return total + (set ? setSize(set) : 0);
      }, 0);
    case "sightWords":
      return data.subjectData.reading.sightWords[option.grade]?.length ?? 0;
    case "frenchColors":
      return data.subjectData.french.colors.colors.length * 3;
    case "countries":
      return (build.regions ?? Object.keys(data.subjectData.geography.worldRegions)).reduce(
        (total, key) => total + (data.subjectData.geography.worldRegions[key]?.countries.length ?? 0),
        0
      );
    case "states":
    case "stateCapitals":
      return statesIn(data.subjectData.geography, build.regions).length;
    default:
      return 0;
  }
}

export function deckDescription(option: DeckOption, data: FlashcardData): string {
  return option.description.replace("{count}", String(cardCount(option, data)));
}

export function getDecksForGrade(data: FlashcardData, grade: GradeKey): DeckOption[] {
  return deckOptions(data).filter((option) => option.grade === grade);
}

export function getDeckOptionById(data: FlashcardData, id: string): DeckOption | null {
  return deckOptions(data).find((option) => option.id === id) ?? null;
}

/** The units list for a grade's subject, or null when the subject lists plain decks. */
export function unitsFor(data: FlashcardData, grade: GradeKey, subject: string): UnitView[] | null {
  const units = gradeFor(data, grade)?.subjects.find((entry) => entry.subject === subject)?.units;
  return units
    ? labeled(units).map((unit) => ({
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
  const { wrongChoices } = data.appSettings.multipleChoice;
  switch (build.type) {
    case "cards": {
      const choices = option.interaction === "multiple-choice" ? wrongChoices : undefined;
      return {
        subject: build.deckType ?? option.subject,
        grade: option.grade,
        ...(option.unitName || option.interaction === "multiple-choice" ? { unitLabel: info.unitLabel } : {}),
        ...(build.operation ? { operation: build.operation } : {}),
        ...(build.listen ? { listen: true } : {}),
        cards: build.sets.flatMap((key) => {
          const set = cardSetFor(data, option, key);
          return set ? setCards(set, choices) : [];
        })
      } as SubjectDeck;
    }
    case "sightWords":
      return {
        subject: "sight-words",
        grade: option.grade,
        cards: (data.subjectData.reading.sightWords[option.grade] ?? []).map((word) => ({ prompt: word, answers: [word] }))
      };
    case "frenchColors":
      return createFrenchColorsDeck(data.subjectData.french.colors, wrongChoices, { grade: option.grade, unitLabel: option.title });
    case "wholeNumberOperations":
      return createWholeNumberDeck(build.topic, data.subjectData.math.wholeNumberOperations, info);
    case "grade5":
      return createGrade5Deck(build.topic, data.subjectData.math.grade5, info);
    case "decimalOperations":
      // The play screen already titles these "Decimal Operations", so the label is just the unit.
      return createDecimalOperationsDeck(data.subjectData.math.decimalOperations, {
        grade: option.grade,
        unitLabel: option.unitName ?? info.unitLabel
      });
    case "calculationPractice":
      return createCalculationPracticeDeck(
        data.subjectData.math.calculationPractice,
        { grade: option.grade, unitLabel: option.unitName ?? info.unitLabel },
        build.topic
      );
    case "countries":
      // The map data is large, so it only loads once a geography deck starts.
      return (await import("./subjects/geography/countriesDeck")).createCountriesDeck(
        data.subjectData.geography,
        build.regions,
        info,
        wrongChoices
      );
    case "states":
      return (await import("./subjects/geography/statesDeck")).createStatesDeck(
        data.subjectData.geography,
        build.regions,
        info,
        wrongChoices
      );
    case "stateCapitals":
      return (await import("./subjects/geography/statesDeck")).createStateCapitalsDeck(
        data.subjectData.geography,
        build.regions,
        info,
        wrongChoices
      );
    default:
      throw new Error(`Unknown deck type "${(build as { type: string }).type}".`);
  }
};

/** Play screen wording for a deck: the defaults, overridden by its subject, then (for math) its operation. */
export const playTextFor = (data: FlashcardData, deck: SubjectDeck): PlayText => ({
  ...data.appSettings.playText.default,
  ...data.appSettings.playText[deck.subject],
  ...(deck.subject === "math" ? data.appSettings.playText[deck.operation] : undefined)
});

/** A fresh deck each play: written cards from flashcards.json, or generated from its math rules. */
export async function resolveDeck(option: DeckOption, data: FlashcardData): Promise<SubjectDeck> {
  const deck = await buildDeck(option, data);
  if (deck.cards.length === 0) {
    throw new Error(`Deck "${option.id}" has no cards.`);
  }
  return deck;
}
