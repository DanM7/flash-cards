import type { Card, DeckInfo, FrenchDeck } from "../../CardTypes";
import { spreadWrongAnswers, withAnswer } from "../../wrongAnswers";

export interface FrenchColor {
  fr: string;
  en: string;
  /** A short French phrase using the color, e.g. "un ballon rouge". */
  phrase: string;
  /** Its English meaning with the color left as "{color}", e.g. "a {color} ball". */
  phraseEn: string;
  /** Replaces the phrase card's usual hint, e.g. to explain a feminine form. */
  phraseHint?: string;
}

interface Template {
  question: string;
  hint: string;
}

export interface FrenchColors {
  /**
   * Wording for the three cards each color gets. Placeholders: {fr}, {en}, {phrase}, {initial} (first
   * letter of the French word), {blank} (the phrase with the color word left out), {example} (the
   * phrase in English).
   */
  templates: { toFrench: Template; toEnglish: Template; phrase: Template };
  /** French word → English word; wrong answers that aren't colors, in each language. */
  additionalIncorrectAnswers: Record<string, string>;
  colors: FrenchColor[];
}

const fill = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

/** "a {color} ball" with a color, fixing "a" to "an" before a vowel. */
const phraseWith = (pattern: string, color: string): string =>
  pattern.replace("{color}", color).replace(/^a (?=[aeiou])/, "an ");

/**
 * Three cards per color: English to French, French to English, and what a phrase means. Wrong answers
 * are other colors (plus the non-color words, for single words), spread evenly; phrase cards swap
 * other colors into the same phrase, so only the color word gives the answer away.
 */
export function createFrenchColorsDeck(data: FrenchColors, wrongChoices: number, info: DeckInfo): FrenchDeck {
  const { templates, colors } = data;
  const extraFrench = Object.keys(data.additionalIncorrectAnswers);
  const extraEnglish = Object.values(data.additionalIncorrectAnswers);
  const spread = (answers: string[], extra: string[]) =>
    spreadWrongAnswers(answers.map((answer) => [answer]), [...answers, ...extra], wrongChoices);
  const french = colors.map((color) => color.fr);
  const english = colors.map((color) => color.en);
  const wrongFrench = spread(french, extraFrench);
  const wrongEnglish = spread(english, extraEnglish);
  const wrongPhraseColors = spread(english, []);

  const cards = colors.flatMap((color, index): Card[] => {
    const example = phraseWith(color.phraseEn, color.en);
    const values = {
      fr: color.fr,
      en: color.en,
      phrase: color.phrase,
      initial: color.fr[0],
      blank: color.phrase
        .split(" ")
        .map((word) => (word.startsWith(color.fr) ? "___" : word))
        .join(" "),
      example
    };
    return [
      {
        prompt: fill(templates.toFrench.question, values),
        answers: [color.fr],
        choices: withAnswer(color.fr, wrongFrench[index]),
        hint: fill(templates.toFrench.hint, values)
      },
      {
        prompt: fill(templates.toEnglish.question, values),
        answers: [color.en],
        choices: withAnswer(color.en, wrongEnglish[index]),
        hint: fill(templates.toEnglish.hint, values)
      },
      {
        prompt: fill(templates.phrase.question, values),
        answers: [example],
        choices: withAnswer(
          example,
          wrongPhraseColors[index].map((other) => phraseWith(color.phraseEn, other))
        ),
        hint: color.phraseHint ?? fill(templates.phrase.hint, values)
      }
    ];
  });

  return { subject: "french", grade: info.grade, unitLabel: info.unitLabel, cards };
}
