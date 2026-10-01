import type { Card, Flashcard } from "./CardTypes";

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/** The answer and `wrongChoices` wrong ones; a longer list is a pool to pick fresh wrong ones from each play. */
const pickChoices = (answer: string, choices: string[], wrongChoices: number): string[] => {
  if (choices.length <= wrongChoices + 1) {
    return [...choices];
  }
  const wrong = choices.filter((choice) => choice !== answer);
  return shuffle([answer, ...shuffle(wrong).slice(0, wrongChoices)]);
};

export const toCard = (flashcard: Flashcard, wrongChoices: number): Card => {
  const card: Card = { prompt: flashcard.question, answers: [flashcard.answer, ...(flashcard.acceptedAnswers ?? [])] };
  if (flashcard.choices) {
    card.choices = pickChoices(flashcard.answer, flashcard.choices, wrongChoices);
  }
  if (flashcard.hint) {
    card.hint = flashcard.hint;
  }
  if (flashcard.countryId) {
    card.map = flashcard.continent
      ? { countryId: flashcard.countryId, continent: flashcard.continent }
      : { countryId: flashcard.countryId };
  }
  if (flashcard.acceptableTranscripts) {
    card.acceptableTranscripts = flashcard.acceptableTranscripts;
  }
  return card;
};

export const flashcardsIn = (flashcards: Flashcard[], category: string): Flashcard[] =>
  flashcards.filter((flashcard) => flashcard.category === category);

export const cardsIn = (flashcards: Flashcard[], category: string, wrongChoices: number): Card[] =>
  flashcardsIn(flashcards, category).map((flashcard) => toCard(flashcard, wrongChoices));
