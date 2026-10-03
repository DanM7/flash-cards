const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Picks `count` wrong answers for each card from `pool`, never one of the card's own answers.
 * Cards take turns in random order and always take the least-used entries, so across a deck every
 * pool entry shows up about equally often.
 */
export function spreadWrongAnswers(answersPerCard: string[][], pool: string[], count: number): string[][] {
  const uses = new Map<string, number>();
  for (const entry of pool) {
    if (![...uses.keys()].some((seen) => same(seen, entry))) {
      uses.set(entry, 0);
    }
  }
  const picked: string[][] = answersPerCard.map(() => []);
  for (const index of shuffle(answersPerCard.map((_, i) => i))) {
    const own = answersPerCard[index];
    const choices = shuffle([...uses.keys()].filter((entry) => !own.some((answer) => same(answer, entry))))
      .sort((a, b) => (uses.get(a) as number) - (uses.get(b) as number))
      .slice(0, count);
    for (const choice of choices) {
      uses.set(choice, (uses.get(choice) as number) + 1);
    }
    picked[index] = choices;
  }
  return picked;
}

/** `count` of a card's own wrong answers, at random. */
export const pickOwnWrongAnswers = (incorrect: string[], count: number): string[] => shuffle(incorrect).slice(0, count);

/** The answer and its wrong answers, in random order. */
export const withAnswer = (answer: string, wrong: string[]): string[] => shuffle([answer, ...wrong]);
