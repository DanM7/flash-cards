import { describe, expect, it } from "vitest";
import type { CardSet, SubjectDeck } from "../../src/data/CardTypes";
import { getDeckOptionById, resolveDeck, type DeckOption } from "../../src/data/decks";
import { createFrenchColorsDeck } from "../../src/data/subjects/french/colors";
import { flashcardData } from "../helpers/flashcards";
import { seedRandom } from "../helpers/random";

const deck = (id: string): Promise<SubjectDeck> =>
  resolveDeck(getDeckOptionById(flashcardData, id) as DeckOption, flashcardData);

describe("6th grade science decks", () => {
  it("labels each unit and keeps the right answer among the choices", async () => {
    const decks = await Promise.all(
      ["cells", "human-body", "genetics", "evolution", "environmental-science"].map((unit) => deck(`6-science-${unit}`))
    );
    expect(decks.map((entry) => ("unitLabel" in entry ? entry.unitLabel : ""))).toEqual([
      "Unit 1: Cells",
      "Unit 2: Human Body",
      "Unit 3: Genetics",
      "Unit 4: Evolution",
      "Unit 5: Environmental Science"
    ]);
    for (const entry of decks) {
      expect(entry).toMatchObject({ subject: "science", grade: 6 });
      expect(entry.cards).toHaveLength(5);
      for (const card of entry.cards) {
        expect(card.choices).toHaveLength(4);
        expect(card.choices).toContain(card.answers[0]);
      }
    }
    expect(decks[0].cards[0]).toMatchObject({ prompt: "What is the basic unit of life?", answers: ["Cell"] });
  });

  it("draws wrong answers from the unit's other answers and its additional wrong answers", async () => {
    const set = flashcardData.subjectData.science.cardSets?.cells as CardSet;
    const pool = new Set([...Object.values(set.cards), ...(set.additionalIncorrectAnswers ?? [])]);
    for (const card of (await deck("6-science-cells")).cards) {
      expect(card.choices?.every((choice) => pool.has(choice)), card.prompt).toBe(true);
    }
  });
});

describe("6th grade French alphabet deck", () => {
  it("reads every letter aloud in French, accents included", async () => {
    const alphabet = await deck("6-french-alphabet");
    expect(alphabet).toMatchObject({ subject: "french", grade: 6, unitLabel: "Unit 1: Alphabet", listen: true });
    const answers = alphabet.cards.map((card) => card.answers[0]);
    expect(answers.slice(0, 26).join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(answers.slice(26)).toEqual(["é", "è", "ê", "ë", "à", "â", "î", "ï", "ô", "ù", "û", "ç"]);
    for (const card of alphabet.cards) {
      expect(card.lang).toBe("fr-FR");
      expect(card.choices).toHaveLength(4);
      expect(new Set(card.choices).size).toBe(4);
      expect(card.choices).toContain(card.answers[0]);
    }
  });

  it("names accented letters the French way, so each one sounds different", async () => {
    const byAnswer = new Map((await deck("6-french-alphabet")).cards.map((card) => [card.answers[0], card]));
    expect(byAnswer.get("é")?.prompt).toBe("e accent aigu");
    expect(byAnswer.get("ç")?.prompt).toBe("c cédille");
    expect(byAnswer.get("y")?.prompt).toBe("i grec");
    expect(byAnswer.get("w")?.prompt).toBe("double vé");
    expect(new Set([...byAnswer.values()].map((card) => card.prompt)).size).toBe(byAnswer.size);
  });
});

describe("6th grade French colors deck", () => {
  it("has three cards per color with four distinct choices", async () => {
    seedRandom(7);
    const colors = await deck("6-french-colors");
    expect(colors).toMatchObject({ subject: "french", grade: 6, unitLabel: "Unit 3: Colors" });
    expect(colors).not.toHaveProperty("listen");
    expect(colors.cards.some((card) => "lang" in card)).toBe(false);
    expect(colors.cards).toHaveLength(36);
    for (const card of colors.cards) {
      expect(new Set(card.choices).size).toBe(4);
      expect(card.choices).toContain(card.answers[0]);
      expect(card.hint).toBeTruthy();
    }
  });

  it("builds each card type with a helpful hint", async () => {
    const byPrompt = new Map((await deck("6-french-colors")).cards.map((card) => [card.prompt, card]));

    expect(byPrompt.get('How do you say "red" in French?')).toMatchObject({
      answers: ["rouge"],
      hint: 'It starts with "r": un ballon ___ (a red ball).'
    });
    expect(byPrompt.get('How do you say "orange" in French?')?.hint).toBe(
      'It starts with "o": une ___ (an orange fruit).'
    );
    expect(byPrompt.get('What does "bleu" mean?')).toMatchObject({
      answers: ["blue"],
      hint: `You'd see it in "le ciel est bleu".`
    });
    expect(byPrompt.get('What does "un chat noir" mean?')).toMatchObject({
      answers: ["a black cat"],
      hint: 'The color word is "noir".'
    });
    expect(byPrompt.get('What does "une feuille verte" mean?')?.hint).toBe(
      `"verte" is "vert" + e because "feuille" is feminine.`
    );
    expect(byPrompt.get('What does "des fleurs violettes" mean?')?.answers).toEqual(["purple flowers"]);
  });

  it("draws fresh wrong answers from the same kind of answer each play", async () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      seedRandom(seed);
      const card = (await deck("6-french-colors")).cards.find((c) => c.prompt === 'What does "un ballon rouge" mean?');
      card?.choices?.forEach((choice) => seen.add(choice));
    }
    expect(seen.size).toBeGreaterThan(4);
    for (const choice of seen) {
      expect(choice).toMatch(/^an? \w+ ball$/);
    }
  });

  it("mixes non-color words into single-word wrong answers, in the matching language", async () => {
    const { additionalIncorrectAnswers, colors } = flashcardData.subjectData.french.colors;
    const french = new Set([...colors.map((color) => color.fr), ...Object.keys(additionalIncorrectAnswers)]);
    const english = new Set([...colors.map((color) => color.en), ...Object.values(additionalIncorrectAnswers)]);
    const cards = (await deck("6-french-colors")).cards;
    const toFrench = cards.filter((card) => card.prompt.startsWith("How do you say"));
    const toEnglish = cards.filter((card) => /^What does "\S+" mean\?$/.test(card.prompt));
    expect(toFrench.flatMap((card) => card.choices).every((choice) => french.has(choice as string))).toBe(true);
    expect(toEnglish.flatMap((card) => card.choices).every((choice) => english.has(choice as string))).toBe(true);
    expect(toFrench.flatMap((card) => card.choices).some((choice) => choice === "crayon" || choice === "ville")).toBe(true);
  });

  it("leaves a placeholder it doesn't know as written", () => {
    const data = structuredClone(flashcardData.subjectData.french.colors);
    data.templates.toFrench.question = "Say {en} {mystery}";
    const deck = createFrenchColorsDeck(data, 3, { grade: 6, unitLabel: "Colors" });
    expect(deck.cards[0].prompt).toBe(`Say ${data.colors[0].en} {mystery}`);
  });
});
