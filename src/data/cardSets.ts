import type { Card, CardEntry, CardSet } from "./CardTypes";
import { pickOwnWrongAnswers, spreadWrongAnswers, withAnswer } from "./wrongAnswers";

interface WrittenCard {
  question: string;
  answer: string;
  acceptedAnswers: string[];
  incorrectAnswers?: string[];
  hint?: string;
}

const toWritten = (question: string, entry: CardEntry): WrittenCard =>
  typeof entry === "string"
    ? { question, answer: entry, acceptedAnswers: [] }
    : {
        question,
        answer: entry.answer ?? question,
        acceptedAnswers: entry.acceptedAnswers ?? [],
        incorrectAnswers: entry.incorrectAnswers,
        hint: entry.hint
      };

export const setSize = (set: CardSet): number => Object.keys(set.cards).length;

/**
 * Playable cards for one set. With `wrongChoices`, every card gets that many wrong answers: its own
 * `incorrectAnswers` when it has them, otherwise the set's other answers and additional wrong answers,
 * spread evenly across the set.
 */
export function setCards(set: CardSet, wrongChoices?: number): Card[] {
  const written = Object.entries(set.cards).map(([question, entry]) => toWritten(question, entry));
  const answersOf = (card: WrittenCard) => [card.answer, ...card.acceptedAnswers];
  const shared = written.filter((card) => !card.incorrectAnswers);
  const spread =
    wrongChoices === undefined
      ? []
      : spreadWrongAnswers(
          shared.map(answersOf),
          [...written.map((card) => card.answer), ...(set.additionalIncorrectAnswers ?? [])],
          wrongChoices
        );
  return written.map((card) => {
    const result: Card = { prompt: card.question, answers: answersOf(card) };
    if (wrongChoices !== undefined) {
      const wrong = card.incorrectAnswers
        ? pickOwnWrongAnswers(card.incorrectAnswers, wrongChoices)
        : spread[shared.indexOf(card)];
      result.choices = withAnswer(card.answer, wrong);
    }
    if (card.hint) {
      result.hint = card.hint;
    }
    if (set.lang) {
      result.lang = set.lang;
    }
    return result;
  });
}
