import { describe, expect, it } from "vitest";
import type { FlashcardData } from "../../src/data/CardTypes";
import {
  cardCount,
  colorFor,
  deckDescription,
  deckOptions,
  findDeckByUnit,
  getDeckOptionById,
  getDecksForGrade,
  gradeFor,
  playTextFor,
  resolveDeck,
  subjectLabelFor,
  subjectStepFor,
  unitsFor,
  type DeckOption
} from "../../src/data/decks";
import { copyFlashcardData, flashcardData } from "../helpers/flashcards";

const option = (id: string, data: FlashcardData = flashcardData) => getDeckOptionById(data, id) as DeckOption;

describe("subjects", () => {
  it("gives every subject its label and fixed color", () => {
    expect(flashcardData.catalog.subjects).toEqual({
      math: { label: "Math", color: "red" },
      science: { label: "Science", color: "green" },
      french: { label: "French", color: "purple" },
      reading: { label: "Reading", color: "blue" },
      history: { label: "History", color: "yellow" },
      geography: { label: "Geography", color: "orange" },
      angular: { label: "Angular", color: "red" },
      "azure-fundamentals": { label: "Azure Fundamentals", color: "blue" }
    });
    expect(subjectLabelFor(flashcardData, "geography")).toBe("Geography");
    expect(colorFor(flashcardData, "reading")).toBe("blue");
  });

  it("falls back to the key and no color for a subject the file doesn't describe", () => {
    expect(subjectLabelFor(flashcardData, "art")).toBe("art");
    expect(colorFor(flashcardData, "art")).toBe("");
  });
});

describe("grades", () => {
  it("lists grades 2 through 6 and Computer Science, each with its own tile color", () => {
    expect(flashcardData.catalog.grades.map((grade) => [grade.grade, grade.label, grade.color])).toEqual([
      [2, "2nd Grade", "sky"],
      [3, "3rd Grade", "violet"],
      [4, "4th Grade", "teal"],
      [5, "5th Grade", "rose"],
      [6, "6th Grade", "amber"],
      ["computer-science", "Computer Science", "blue"]
    ]);
    expect(gradeFor(flashcardData, 9)).toBeUndefined();
  });

  it("only offers a subject step for grades that ask for one", () => {
    expect(flashcardData.catalog.grades.every((grade) => grade.pickSubject)).toBe(true);
    expect(subjectStepFor(flashcardData, 4)?.map((entry) => entry.subject)).toEqual(["math", "geography", "reading"]);
    const data = copyFlashcardData();
    delete data.catalog.grades[2].pickSubject;
    expect(subjectStepFor(data, 4)).toBeUndefined();
    expect(subjectStepFor(flashcardData, 9)).toBeUndefined();
    expect(subjectStepFor(flashcardData, 6)?.map((entry) => entry.subject)).toEqual([
      "math",
      "science",
      "french",
      "geography"
    ]);
  });

  it("only names subjects the file describes", () => {
    for (const grade of flashcardData.catalog.grades) {
      for (const entry of grade.subjects) {
        expect(flashcardData.catalog.subjects, `${grade.grade} ${entry.subject}`).toHaveProperty(entry.subject);
      }
    }
  });
});

describe("deck catalog", () => {
  it("builds ids from grade, subject, and a stable unit code", () => {
    const options = deckOptions(flashcardData);
    const ids = options.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of options) {
      expect(entry.id).toBe(`${entry.grade}-${entry.subject}-${entry.unit}`);
      expect(entry.unit).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it("works the catalog out once per file", () => {
    expect(deckOptions(flashcardData)).toBe(deckOptions(flashcardData));
  });

  it("badges plain decks with the subject and unit decks with the unit", () => {
    expect(option("2-math-addition")).toMatchObject({
      title: "Addition",
      badge: "Math",
      gradeLabel: "2nd Grade",
      interaction: "multiple-choice"
    });
    expect(option("6-geography-europe-west")).toMatchObject({
      title: "Unit 4: Europe: West",
      badge: "Geography · Unit 4",
      unitName: "Unit 4",
      build: { type: "countries", regions: ["europe-west"] }
    });
    expect(option("6-geography-final")).toMatchObject({ title: "Final: All Countries", unitName: "Final" });
  });

  it("numbers units in order, skipping ones with their own label", () => {
    const data = copyFlashcardData();
    data.catalog.grades[0].subjects[0].units = [
      "First",
      { label: "Review", title: "Look back" },
      { title: "Second", deck: { unit: "second", description: "", build: { type: "sightWords" } } }
    ];
    expect(unitsFor(data, 2, "math")?.map((unit) => [unit.label, unit.title, unit.option?.id ?? null])).toEqual([
      ["Unit 1", "First", null],
      ["Review", "Look back", null],
      ["Unit 2", "Second", "2-math-second"]
    ]);
  });

  it("filters decks by grade", () => {
    const grade4 = getDecksForGrade(flashcardData, 4);
    expect(grade4.map((entry) => [entry.id, entry.interaction])).toEqual([
      ["4-math-addition", "multiple-choice"],
      ["4-math-subtraction", "multiple-choice"],
      ["4-math-multiplication", "multiple-choice"],
      ["4-math-division", "multiple-choice"],
      ["4-math-mixed", "multiple-choice"],
      ["4-geography-states", "multiple-choice"],
      ["4-geography-state-capitals", "multiple-choice"],
      ["4-reading-vocabulary", "multiple-choice"],
      ["4-reading-sight-words", "voice-or-type"]
    ]);
  });

  it("lists units with their decks, including coming-soon units and the geography final", () => {
    const geography = unitsFor(flashcardData, 6, "geography") ?? [];
    expect(geography).toHaveLength(12);
    expect(geography[11]).toMatchObject({ label: "Final", title: "All Countries", option: { id: "6-geography-final" } });
    const math = unitsFor(flashcardData, 6, "math") ?? [];
    expect(math.slice(0, 3).map((unit) => [unit.label, unit.title, unit.option?.id ?? null])).toEqual([
      ["Unit 0", "Calculation Practice", "6-math-calculation-practice"],
      ["Unit 1", "Decimal Operations", "6-math-decimal-operations"],
      ["Unit 2", "Fraction Operations", null]
    ]);
    expect(math.filter((unit) => !unit.option)).toHaveLength(9);
  });

  it("has no units list for subjects that list plain decks, or for unknown grades", () => {
    expect(unitsFor(flashcardData, 2, "math")).toBeNull();
    expect(unitsFor(flashcardData, 9, "math")).toBeNull();
  });

  it("returns null for an unknown deck id", () => {
    expect(getDeckOptionById(flashcardData, "nope")).toBeNull();
  });
});

describe("playTextFor", () => {
  it("layers the defaults, the subject, and the math operation", () => {
    const decimals = playTextFor(flashcardData, { subject: "math", operation: "decimal-operations", cards: [] });
    expect(decimals).toMatchObject({
      title: "Decimal Operations",
      choiceCue: "Solve this",
      promptName: "problem",
      finishedTitle: "You finished the deck!",
      choiceFinished: "Solid decimal practice. Head home when you want another round."
    });
    expect(playTextFor(flashcardData, { subject: "math", operation: "addition", cards: [] }).title).toBe("Math facts");
    expect(playTextFor(flashcardData, { subject: "sight-words", grade: 4, cards: [] })).toMatchObject({
      title: "Speech & Typing",
      typingCue: "Say this word"
    });
    expect(playTextFor(flashcardData, { subject: "vocabulary", cards: [] })).toMatchObject({
      title: "Vocabulary",
      listenCue: "Listen to the word"
    });
  });

  it("uses the defaults for a deck type with no wording of its own", () => {
    expect(playTextFor(flashcardData, { subject: "custom", cards: [] })).toEqual(flashcardData.appSettings.playText.default);
  });
});

describe("findDeckByUnit", () => {
  it("finds a deck by grade, subject, and unit code, ignoring case", () => {
    expect(findDeckByUnit(flashcardData, "6", "geography", " EUROPE-WEST ")?.id).toBe("6-geography-europe-west");
  });

  it("matches any subject when the subject is blank", () => {
    expect(findDeckByUnit(flashcardData, "4", "", "sight-words")?.id).toBe("4-reading-sight-words");
  });

  it("returns null for a blank, unknown, or mismatched unit", () => {
    expect(findDeckByUnit(flashcardData, "6", "geography", "  ")).toBeNull();
    expect(findDeckByUnit(flashcardData, "6", "geography", "atlantis")).toBeNull();
    expect(findDeckByUnit(flashcardData, "6", "science", "europe-west")).toBeNull();
    expect(findDeckByUnit(flashcardData, "5", "geography", "europe-west")).toBeNull();
  });
});

describe("deckDescription", () => {
  it("fills in how many flashcards the deck draws from", () => {
    expect(deckDescription(option("6-geography-europe-west"), flashcardData)).toBe(
      "Name all 23 countries of Western Europe from a blank map."
    );
    expect(deckDescription(option("6-geography-final"), flashcardData)).toBe(
      "All 194 countries in random order, mixed across every continent."
    );
    expect(deckDescription(option("4-geography-states"), flashcardData)).toBe(
      "Name all 50 states from a blank U.S. map."
    );
    expect(deckDescription(option("4-geography-state-capitals"), flashcardData)).toContain("50 states.");
  });

  it("leaves descriptions without a count alone", () => {
    const cells = option("6-science-cells");
    expect(deckDescription(cells, flashcardData)).toBe(cells.description);
  });

  it("counts cards in sets, words, colors, regions, and states, skipping ones the file doesn't have", () => {
    const counted = (build: DeckOption["build"], grade = 4) =>
      cardCount({ ...option("4-reading-sight-words"), grade, build }, flashcardData);
    const { reading, french, geography } = flashcardData.subjectData;
    const { sightWords } = reading;
    // Sets are looked up in the deck's own subject (reading here), so French letters aren't found.
    expect(counted({ type: "cards", sets: ["vocabulary-grade3", "letters", "nope"] })).toBe(
      Object.keys(reading.cardSets?.["vocabulary-grade3"].cards ?? {}).length
    );
    const cellsIn = (subject: string) =>
      cardCount({ ...option("6-science-cells"), subject, build: { type: "cards", sets: ["cells"] } }, flashcardData);
    expect(cellsIn("science")).toBe(5);
    expect(cellsIn("geography")).toBe(0);
    expect(cellsIn("history")).toBe(0);
    expect(counted({ type: "sightWords" })).toBe(sightWords["4"].length);
    expect(counted({ type: "sightWords" }, 9)).toBe(0);
    expect(counted({ type: "frenchColors" })).toBe(french.colors.colors.length * 3);
    expect(counted({ type: "countries", regions: ["oceania", "atlantis"] })).toBe(
      geography.worldRegions.oceania.countries.length
    );
    expect(counted({ type: "states", regions: ["southwest", "atlantis"] })).toBe(4);
    expect(counted({ type: "stateCapitals" })).toBe(50);
    expect(counted({ type: "grade5", topic: "order-of-operations" })).toBe(0);
  });
});

describe("resolveDeck", () => {
  it("builds every deck option into a playable deck", async () => {
    for (const entry of deckOptions(flashcardData)) {
      const deck = await resolveDeck(entry, flashcardData);
      expect(deck.cards.length, entry.id).toBeGreaterThan(0);
      if (entry.interaction === "multiple-choice") {
        for (const card of deck.cards) {
          expect(card.choices, `${entry.id}: ${card.prompt}`).toContain(card.answers[0]);
          expect(new Set(card.choices).size).toBe(card.choices?.length);
        }
      }
    }
  }, 60_000);

  it("builds the 4th grade sight words", async () => {
    const sightWords = await resolveDeck(option("4-reading-sight-words"), flashcardData);
    expect(sightWords).toMatchObject({ subject: "sight-words", grade: 4 });
    expect(sightWords).not.toHaveProperty("unitLabel");
    const words = flashcardData.subjectData.reading.sightWords["4"];
    expect(words.length).toBeGreaterThanOrEqual(20);
    expect(sightWords.cards).toEqual(words.map((word) => ({ prompt: word, answers: [word] })));
    expect(sightWords).not.toHaveProperty("listen");
  });

  it("offers every math deck as multiple choice", () => {
    const math = deckOptions(flashcardData).filter((entry) => entry.subject === "math");
    expect(math.length).toBeGreaterThan(0);
    expect(math.every((entry) => entry.interaction === "multiple-choice")).toBe(true);
  });

  it("has no sight words for a grade the file doesn't list them for", async () => {
    const data = copyFlashcardData();
    data.subjectData.reading.sightWords = {};
    await expect(resolveDeck(option("4-reading-sight-words", data), data)).rejects.toThrow("has no cards");
  });

  it.each([
    ["2-reading-vocabulary", 2],
    ["3-reading-vocabulary", 3],
    ["4-reading-vocabulary", 4]
  ])("reads the %s words aloud, to be found among look-alikes, at least two rounds' worth", async (id, grade) => {
    const vocabulary = await resolveDeck(option(id), flashcardData);
    expect(vocabulary).toMatchObject({ subject: "vocabulary", grade, listen: true });
    expect(vocabulary.cards.length).toBeGreaterThanOrEqual(2 * flashcardData.appSettings.multipleChoice.roundSize);
    for (const card of vocabulary.cards) {
      expect(card.answers).toEqual([card.prompt]);
      expect(new Set(card.choices).size, card.prompt).toBe(4);
      expect(card.hint).toContain("___");
      // Whole words only, so short words like "a" and "I" can still have hints.
      const hintWords = (card.hint ?? "").toLowerCase().split(/[^a-z']+/);
      expect(hintWords, card.prompt).not.toContain(card.prompt.toLowerCase());
    }
  });

  it("labels each deck for the play screen", async () => {
    const labelOf = async (id: string) => {
      const deck = await resolveDeck(option(id), flashcardData);
      return "unitLabel" in deck ? deck.unitLabel : undefined;
    };
    expect(await labelOf("2-math-addition")).toBe("2nd Grade · Addition");
    expect(await labelOf("3-math-mixed")).toBe("3rd Grade · All Four Operations");
    expect(await labelOf("5-math-order-of-operations")).toBe("5th Grade · Order of Operations");
    expect(await labelOf("6-math-decimal-operations")).toBe("Unit 1");
    expect(await labelOf("6-math-calculation-practice")).toBe("Unit 0");
    expect(await labelOf("6-science-cells")).toBe("Unit 1: Cells");
    expect(await labelOf("6-french-colors")).toBe("Unit 3: Colors");
    expect(await labelOf("6-geography-final")).toBe("Final: All Countries");
  });

  it.each([
    ["angular", "beginner", "beginner", 24],
    ["angular", "intermediate", "intermediate", 28],
    ["angular", "expert", "expert", 28],
    ["angular", "mastery", "mastery", 20],
    ["azure-fundamentals", "all-terms", "terms", 40]
  ])("shows each %s %s definition and asks for the term, among the deck's other terms", async (subject, unit, set, size) => {
    const option = getDeckOptionById(flashcardData, `computer-science-${subject}-${unit}`) as DeckOption;
    expect(findDeckByUnit(flashcardData, "computer-science", subject, unit)).toBe(option);
    const deck = await resolveDeck(option, flashcardData);
    expect(deck).toMatchObject({ subject, grade: "computer-science" });
    expect("unitLabel" in deck && deck.unitLabel).toBe(`Computer Science · ${option.title}`);
    // Written term → definition, played definition → term.
    const cardSet = flashcardData.subjectData[subject].cardSets?.[set];
    expect(cardSet?.show).toBe("value");
    const definitionOf = new Map(Object.entries(cardSet?.cards ?? {}));
    expect(new Set(definitionOf.values()).size).toBe(size);
    expect(deck.cards).toHaveLength(size);
    for (const card of deck.cards) {
      expect(card.prompt).toMatch(/\.$/);
      expect(definitionOf.get(card.answers[0])).toBe(card.prompt);
      expect(card.choices).toHaveLength(4);
      expect(new Set(card.choices).size).toBe(4);
      expect(card.choices?.every((choice) => definitionOf.has(choice))).toBe(true);
    }
  });

  it("labels a decimal deck listed as a plain deck by grade and title", async () => {
    const data = copyFlashcardData();
    data.catalog.grades[0].subjects[0].decks?.push({
      unit: "decimals",
      title: "Decimals",
      description: "",
      build: { type: "decimalOperations" }
    });
    data.catalog.grades[0].subjects[0].decks?.push({
      unit: "factors",
      title: "Factors",
      description: "",
      build: { type: "calculationPractice", topic: "gcf" }
    });
    const deck = await resolveDeck(option("2-math-decimals", data), data);
    expect(deck).toMatchObject({ grade: 2, unitLabel: "2nd Grade · Decimals" });
    const factors = await resolveDeck(option("2-math-factors", data), data);
    expect(factors).toMatchObject({ grade: 2, unitLabel: "2nd Grade · Factors" });
    expect(factors.cards.every((card) => card.prompt.startsWith("Greatest common factor"))).toBe(true);
  });

  it("plays written math cards as multiple choice with the deck's operation, even if the file asks for typing", async () => {
    const data = copyFlashcardData();
    data.subjectData.math.cardSets = { doubles: { cards: { "2 + 2": "4", "3 + 3": "6" } } };
    data.catalog.grades[0].subjects[0].decks?.push({
      unit: "doubles",
      title: "Doubles",
      description: "",
      interaction: "voice-or-type",
      build: { type: "cards", sets: ["doubles"], operation: "addition" }
    });
    expect(option("2-math-doubles", data).interaction).toBe("multiple-choice");
    const deck = await resolveDeck(option("2-math-doubles", data), data);
    expect(deck).toMatchObject({ subject: "math", grade: 2, operation: "addition", unitLabel: "2nd Grade · Doubles" });
    expect(deck.cards.map((card) => [card.prompt, card.answers, [...(card.choices ?? [])].sort()])).toEqual([
      ["2 + 2", ["4"], ["4", "6"]],
      ["3 + 3", ["6"], ["4", "6"]]
    ]);
  });

  it("builds written cards to say or type with no choices", async () => {
    const data = copyFlashcardData();
    data.subjectData.reading.cardSets = { ...data.subjectData.reading.cardSets, spelling: { cards: { cat: "cat", dog: "dog" } } };
    data.catalog.grades[1].subjects[1].decks?.push({
      unit: "spelling",
      title: "Spelling",
      description: "",
      interaction: "voice-or-type",
      build: { type: "cards", sets: ["spelling"], deckType: "vocabulary" }
    });
    const deck = await resolveDeck(option("3-reading-spelling", data), data);
    expect(deck).toEqual({
      subject: "vocabulary",
      grade: 3,
      cards: [
        { prompt: "cat", answers: ["cat"] },
        { prompt: "dog", answers: ["dog"] }
      ]
    });
  });

  it("rejects an unknown deck type or a deck with no cards", async () => {
    const data = copyFlashcardData();
    data.catalog.grades[0].subjects[0].decks = [
      { unit: "mystery", title: "Mystery", description: "", build: { type: "mystery" } as never },
      { unit: "empty", title: "Empty", description: "", build: { type: "cards", sets: ["nothing-here"] } }
    ];
    await expect(resolveDeck(option("2-math-mystery", data), data)).rejects.toThrow('Unknown deck type "mystery".');
    await expect(resolveDeck(option("2-math-empty", data), data)).rejects.toThrow('Deck "2-math-empty" has no cards.');
  });
});
