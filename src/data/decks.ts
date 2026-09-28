import type { InteractionMode, SightWordsDeck, SubjectDeck, SubjectType } from "./CardTypes";
import sightWordsGrade3 from "./subjects/sight-words/grade3.json";
import mathAddition from "./subjects/math/addition.json";
import { createDecimalOperationsDeck } from "./subjects/math/decimalOperations";
import { createGrade5Deck, type Grade5Topic } from "./subjects/math/grade5";
import {
  createWholeNumberDeck,
  type WholeNumberGrade,
  type WholeNumberTopic
} from "./subjects/math/wholeNumberOperations";
import {
  cellsDeck,
  environmentalScienceDeck,
  evolutionDeck,
  geneticsDeck,
  humanBodyDeck
} from "./subjects/science/grade6";
import { createColorsDeck } from "./subjects/french/grade6";
import { CONTINENTS } from "./subjects/geography/countries";

export type GradeLevel = 2 | 3 | 4 | 5 | 6;

export type SubjectKey = "math" | "science" | "french" | "reading" | "history" | "geography";

export type SubjectColor = "red" | "green" | "purple" | "blue" | "yellow" | "orange";

/** Each subject keeps the same color everywhere it appears. */
export const subjectColors: Record<SubjectKey, SubjectColor> = {
  math: "red",
  science: "green",
  french: "purple",
  reading: "blue",
  history: "yellow",
  geography: "orange"
};

export const colorForSubject = (subject: SubjectType | SubjectKey): SubjectColor | undefined => {
  const key = subject === "sight-words" ? "reading" : subject;
  return key in subjectColors ? subjectColors[key as SubjectKey] : undefined;
};

export interface GradeSubjectSummary {
  subject: SubjectKey;
  label: string;
  summary: string;
}

export interface GradeOption {
  grade: GradeLevel;
  label: string;
  subjects: GradeSubjectSummary[];
}

export interface DeckOption {
  id: string;
  grade: GradeLevel;
  title: string;
  badge: string;
  description: string;
  subject: SubjectType;
  interaction: InteractionMode;
  /** Static deck, or omit when createDeck is used. */
  deck?: SubjectDeck;
  /** Fresh deck each play (e.g. randomized decimal ops); may load its data on demand. */
  createDeck?: () => SubjectDeck | Promise<SubjectDeck>;
}

export const gradeOptions: GradeOption[] = [
  {
    grade: 2,
    label: "2nd Grade",
    subjects: [{ subject: "math", label: "Math", summary: "Addition and subtraction with 1- and 2-digit numbers." }]
  },
  {
    grade: 3,
    label: "3rd Grade",
    subjects: [
      { subject: "math", label: "Math", summary: "All four operations, including negative numbers." }
    ]
  },
  {
    grade: 4,
    label: "4th Grade",
    subjects: [
      { subject: "reading", label: "Reading", summary: "Sight words for reading fluency." },
      { subject: "math", label: "Math", summary: "Quick addition facts." }
    ]
  },
  {
    grade: 5,
    label: "5th Grade",
    subjects: [
      {
        subject: "math",
        label: "Math",
        summary: "Multi-digit multiplication, long division, fractions, decimals, and order of operations."
      }
    ]
  },
  {
    grade: 6,
    label: "6th Grade",
    subjects: [
      { subject: "math", label: "Math", summary: "Decimal operations, with more units coming." },
      { subject: "science", label: "Science", summary: "Cells, human body, genetics, evolution, and environment." },
      { subject: "french", label: "French", summary: "Color words, with more units coming." },
      { subject: "geography", label: "Geography", summary: "Name countries on the map, continent by continent." }
    ]
  }
];

export type SubjectArea = "math" | "science" | "french" | "geography";

export interface SubjectAreaOption {
  id: SubjectArea;
  label: string;
  blurb: string;
  available: boolean;
}

export interface UnitOption {
  unit: number;
  title: string;
  /** Units without a deck are listed as coming soon. */
  deckId?: string;
}

export const sixthGradeSubjectAreas: SubjectAreaOption[] = [
  {
    id: "math",
    label: "Math",
    blurb: "Ten units for the year, starting with Decimal Operations.",
    available: true
  },
  {
    id: "science",
    label: "Science",
    blurb: "Cells, the human body, genetics, evolution, and environmental science.",
    available: true
  },
  {
    id: "french",
    label: "French",
    blurb: "Communication, colors, food, and school, starting with Colors.",
    available: true
  },
  {
    id: "geography",
    label: "Geography",
    blurb: "Countries of the world on the map, one continent per unit.",
    available: true
  }
];

export const sixthGradeMathUnits: UnitOption[] = [
  { unit: 1, title: "Decimal Operations", deckId: "decimal-operations-unit1" },
  { unit: 2, title: "Fraction Operations" },
  { unit: 3, title: "The Number System" },
  { unit: 4, title: "Ratios" },
  { unit: 5, title: "Rates and Percents" },
  { unit: 6, title: "Coordinate Plane" },
  { unit: 7, title: "Expressions" },
  { unit: 8, title: "Equations & Inequalities" },
  { unit: 9, title: "Geometry" },
  { unit: 10, title: "Data and Statistics" }
];

export const sixthGradeScienceUnits: UnitOption[] = [
  { unit: 1, title: "Cells", deckId: "science-cells-unit1" },
  { unit: 2, title: "Human Body", deckId: "science-human-body-unit2" },
  { unit: 3, title: "Genetics", deckId: "science-genetics-unit3" },
  { unit: 4, title: "Evolution", deckId: "science-evolution-unit4" },
  { unit: 5, title: "Environmental Science", deckId: "science-environmental-unit5" }
];

export const sixthGradeFrenchUnits: UnitOption[] = [
  { unit: 1, title: "Communication" },
  { unit: 2, title: "Colors", deckId: "french-colors-unit2" },
  { unit: 3, title: "Food" },
  { unit: 4, title: "School" }
];

const geographyDeckId = (continent: string, unit: number) => `geography-${continent}-unit${unit}`;

export const sixthGradeGeographyUnits: UnitOption[] = CONTINENTS.map((group) => ({
  unit: group.unit,
  title: group.title,
  deckId: geographyDeckId(group.id, group.unit)
}));

export const unitsBySubjectArea: Record<SubjectArea, UnitOption[]> = {
  math: sixthGradeMathUnits,
  science: sixthGradeScienceUnits,
  french: sixthGradeFrenchUnits,
  geography: sixthGradeGeographyUnits
};

/** Grades that pick a subject first; grades not listed go straight to their decks. */
export const subjectAreasByGrade: Partial<Record<GradeLevel, SubjectAreaOption[]>> = {
  2: [
    {
      id: "math",
      label: "Math",
      blurb: "Addition and subtraction up to 100.",
      available: true
    }
  ],
  3: [
    {
      id: "math",
      label: "Math",
      blurb: "All four operations, with numbers from −1000 to 1000.",
      available: true
    }
  ],
  5: [
    {
      id: "math",
      label: "Math",
      blurb: "Multi-digit multiplication, long division, fractions, decimals, and order of operations.",
      available: true
    }
  ],
  6: sixthGradeSubjectAreas
};

const wholeNumberDeckOption = (
  grade: WholeNumberGrade,
  topic: WholeNumberTopic,
  title: string,
  description: string
): DeckOption => ({
  id: `math-grade${grade}-${topic}`,
  grade,
  badge: "Math",
  title,
  description,
  subject: "math",
  interaction: "multiple-choice",
  createDeck: () => createWholeNumberDeck(grade, topic)
});

const grade5DeckOption = (topic: Grade5Topic, title: string, description: string): DeckOption => ({
  id: `math-grade5-${topic}`,
  grade: 5,
  badge: "Math",
  title,
  description,
  subject: "math",
  interaction: "multiple-choice",
  createDeck: () => createGrade5Deck(topic)
});

export const deckOptions: DeckOption[] = [
  wholeNumberDeckOption(2, "add", "Addition", "1- and 2-digit sums that never go over 100."),
  wholeNumberDeckOption(2, "sub", "Subtraction", "1- and 2-digit differences — never below zero."),
  wholeNumberDeckOption(3, "add", "Addition", "Up to 3-digit numbers, including negatives."),
  wholeNumberDeckOption(3, "sub", "Subtraction", "Up to 3-digit numbers, including negatives."),
  wholeNumberDeckOption(3, "mul", "Multiplication", "Times tables through 12, including negatives."),
  wholeNumberDeckOption(3, "div", "Division", "Division facts through 12, including negatives."),
  wholeNumberDeckOption(3, "mixed", "All Four Operations", "A mix of +, −, ×, and ÷ problems."),
  {
    id: "sight-words-grade4",
    grade: 4,
    badge: "Reading",
    title: "Sight Words",
    description:
      "Practice high-frequency words aloud or by typing. Cards shuffle each round; with the mic, pause briefly after each word.",
    subject: "sight-words",
    interaction: "voice-or-type",
    deck: { ...(sightWordsGrade3 as SightWordsDeck), grade: 4 }
  },
  {
    id: "math-addition-grade4",
    grade: 4,
    badge: "Math",
    title: "Addition Facts",
    description:
      "Quick sums under ten. Say the answer or type it — digits like “7” or words like “seven” both work when using voice.",
    subject: "math",
    interaction: "voice-or-type",
    deck: mathAddition as SubjectDeck
  },
  grade5DeckOption(
    "multiplication",
    "Multi-Digit Multiplication",
    "2- and 3-digit numbers times 2-digit numbers, plus 4-digit times 1-digit."
  ),
  grade5DeckOption(
    "division",
    "Long Division",
    "Up to 4-digit dividends and 2-digit divisors, some with remainders."
  ),
  grade5DeckOption(
    "fractions",
    "Fractions",
    "Add and subtract with unlike denominators, and multiply fractions."
  ),
  grade5DeckOption(
    "decimals",
    "Decimals",
    "Add and subtract to hundredths, multiply by whole numbers, and × or ÷ by 10, 100, and 1,000."
  ),
  grade5DeckOption(
    "order-of-operations",
    "Order of Operations",
    "Parentheses, then × and ÷, then + and −."
  ),
  grade5DeckOption("mixed", "Mixed Review", "A mix of every 5th grade topic."),
  {
    id: "decimal-operations-unit1",
    grade: 6,
    badge: "Math · Unit 1",
    title: "Unit 1: Decimal Operations",
    description:
      "Add, subtract, multiply, and divide decimals — including money and measurement.",
    subject: "math",
    interaction: "multiple-choice",
    createDeck: createDecimalOperationsDeck
  },
  {
    id: "science-cells-unit1",
    grade: 6,
    badge: "Science · Unit 1",
    title: "Unit 1: Cells",
    description: "The basic unit of life, cell parts, and what each part does.",
    subject: "science",
    interaction: "multiple-choice",
    deck: cellsDeck
  },
  {
    id: "science-human-body-unit2",
    grade: 6,
    badge: "Science · Unit 2",
    title: "Unit 2: Human Body",
    description: "Body systems and the organs that keep them running.",
    subject: "science",
    interaction: "multiple-choice",
    deck: humanBodyDeck
  },
  {
    id: "science-genetics-unit3",
    grade: 6,
    badge: "Science · Unit 3",
    title: "Unit 3: Genetics",
    description: "DNA, dominant and recessive traits, genotype vs. phenotype, and Punnett squares.",
    subject: "science",
    interaction: "multiple-choice",
    deck: geneticsDeck
  },
  {
    id: "science-evolution-unit4",
    grade: 6,
    badge: "Science · Unit 4",
    title: "Unit 4: Evolution",
    description: "Natural selection, adaptations, fossils, and extinction.",
    subject: "science",
    interaction: "multiple-choice",
    deck: evolutionDeck
  },
  {
    id: "science-environmental-unit5",
    grade: 6,
    badge: "Science · Unit 5",
    title: "Unit 5: Environmental Science",
    description: "Ecosystems, producers, food chains, resources, and pollution.",
    subject: "science",
    interaction: "multiple-choice",
    deck: environmentalScienceDeck
  },
  {
    id: "french-colors-unit2",
    grade: 6,
    badge: "French · Unit 2",
    title: "Unit 2: Colors",
    description: "Twelve color words — French to English, English to French, and short example phrases.",
    subject: "french",
    interaction: "multiple-choice",
    createDeck: createColorsDeck
  },
  ...CONTINENTS.map(
    (group): DeckOption => ({
      id: geographyDeckId(group.id, group.unit),
      grade: 6,
      badge: `Geography · Unit ${group.unit}`,
      title: `Unit ${group.unit}: ${group.title}`,
      description: `Name all ${group.countries.length} countries of ${group.title} from a blank map.`,
      subject: "geography",
      interaction: "multiple-choice",
      // The map data is large, so it only loads once a geography deck starts.
      createDeck: async () => (await import("./subjects/geography/grade6")).createCountriesDeck(group.id)
    })
  )
];

export function getDecksForGrade(grade: GradeLevel): DeckOption[] {
  return deckOptions.filter((option) => option.grade === grade);
}

export function getDeckOptionById(id: string): DeckOption | null {
  return deckOptions.find((option) => option.id === id) ?? null;
}

export async function resolveDeck(option: DeckOption): Promise<SubjectDeck> {
  if (option.createDeck) {
    return await option.createDeck();
  }
  if (option.deck) {
    return option.deck;
  }
  throw new Error(`Deck option "${option.id}" has no deck.`);
}

export async function getDeckById(id: string): Promise<SubjectDeck | null> {
  const option = getDeckOptionById(id);
  return option ? await resolveDeck(option) : null;
}
