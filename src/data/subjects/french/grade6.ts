import type { Card, FrenchDeck } from "../../CardTypes";

interface ColorWord {
  en: string;
  fr: string;
  exampleFr: string;
  /** English meaning of the example; "{a}" becomes "a"/"an" and "{c}" the color. */
  exampleEn: string;
  /** Hint for the example card when the color word needs explaining (e.g. spelling changes). */
  note?: string;
}

const COLORS: ColorWord[] = [
  { en: "red", fr: "rouge", exampleFr: "un ballon rouge", exampleEn: "{a} {c} ball" },
  { en: "blue", fr: "bleu", exampleFr: "le ciel est bleu", exampleEn: "the sky is {c}" },
  {
    en: "green",
    fr: "vert",
    exampleFr: "une feuille verte",
    exampleEn: "{a} {c} leaf",
    note: `"verte" is "vert" + e because "feuille" is feminine.`
  },
  { en: "yellow", fr: "jaune", exampleFr: "un soleil jaune", exampleEn: "{a} {c} sun" },
  { en: "black", fr: "noir", exampleFr: "un chat noir", exampleEn: "{a} {c} cat" },
  {
    en: "white",
    fr: "blanc",
    exampleFr: "une chemise blanche",
    exampleEn: "{a} {c} shirt",
    note: `"blanche" is the feminine form of "blanc" because "chemise" is feminine.`
  },
  { en: "brown", fr: "marron", exampleFr: "un café marron", exampleEn: "{a} {c} coffee" },
  { en: "gray", fr: "gris", exampleFr: "un ciel gris", exampleEn: "{a} {c} sky" },
  {
    en: "orange",
    fr: "orange",
    exampleFr: "une orange",
    exampleEn: "{a} {c} fruit",
    note: `Here "orange" is the fruit itself — same word as the color.`
  },
  { en: "pink", fr: "rose", exampleFr: "une fleur rose", exampleEn: "{a} {c} flower" },
  {
    en: "purple",
    fr: "violet",
    exampleFr: "des fleurs violettes",
    exampleEn: "{c} flowers",
    note: `"violettes" is "violet" made feminine and plural to match "fleurs".`
  },
  { en: "beige", fr: "beige", exampleFr: "un canapé beige", exampleEn: "{a} {c} sofa" }
];

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/** Correct answer plus three different wrong answers drawn from the other colors. */
const choicesFor = (color: ColorWord, answerOf: (word: ColorWord) => string): string[] => {
  const correct = answerOf(color);
  const wrong = [...new Set(COLORS.filter((other) => other !== color).map(answerOf))].filter(
    (value) => value !== correct
  );
  return shuffle([correct, ...shuffle(wrong).slice(0, 3)]);
};

const englishExample = (template: string, color: string): string =>
  template.replace("{a}", /^[aeiou]/.test(color) ? "an" : "a").replace("{c}", color);

const lastWord = (phrase: string): string => phrase.slice(phrase.lastIndexOf(" ") + 1);

const withBlank = (phrase: string): string => phrase.replace(/\S+$/, "___");

const englishToFrench = (color: ColorWord): Card => ({
  prompt: `How do you say "${color.en}" in French?`,
  answers: [color.fr],
  choices: choicesFor(color, (word) => word.fr),
  hint: `It starts with "${color.fr[0]}": ${withBlank(color.exampleFr)} (${englishExample(color.exampleEn, color.en)}).`
});

const frenchToEnglish = (color: ColorWord): Card => ({
  prompt: `What does "${color.fr}" mean?`,
  answers: [color.en],
  choices: choicesFor(color, (word) => word.en),
  hint: `You'd see it in "${color.exampleFr}".`
});

const exampleMeaning = (color: ColorWord): Card => ({
  prompt: `What does "${color.exampleFr}" mean?`,
  answers: [englishExample(color.exampleEn, color.en)],
  choices: choicesFor(color, (word) => englishExample(color.exampleEn, word.en)),
  hint: color.note ?? `The color word is "${lastWord(color.exampleFr)}".`
});

export const createColorsDeck = (): FrenchDeck => ({
  subject: "french",
  grade: 6,
  unitLabel: "Unit 2: Colors",
  cards: COLORS.flatMap((color) => [englishToFrench(color), frenchToEnglish(color), exampleMeaning(color)])
});
