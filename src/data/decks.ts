import type { SubjectDeck } from "./CardTypes";
import sightWordsGrade3 from "./subjects/sight-words/grade3.json";
import mathAddition from "./subjects/math/addition.json";

export interface DeckOption {
  id: string;
  title: string;
  badge: string;
  description: string;
  deck: SubjectDeck;
}

export const deckOptions: DeckOption[] = [
  {
    id: "sight-words-grade3",
    badge: "Reading",
    title: "Sight words · Grade 3",
    description:
      "Practice high-frequency words aloud or by typing. Cards shuffle each round; with the mic, pause briefly after each word.",
    deck: sightWordsGrade3 as SubjectDeck
  },
  {
    id: "math-addition",
    badge: "Math",
    title: "Addition facts",
    description:
      "Quick sums under ten. Say the answer or type it — digits like “7” or words like “seven” both work when using voice.",
    deck: mathAddition as SubjectDeck
  }
];

export function getDeckById(id: string): SubjectDeck | null {
  return deckOptions.find((option) => option.id === id)?.deck ?? null;
}
