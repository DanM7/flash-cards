import type { Card, DeckInfo, GeographyDeck } from "../../CardTypes";
import { statesIn, type GeographyState, type UnitedStatesGeography } from "./states";
import { hasState, neighborNamesOf, stateDistance } from "./usAtlas";

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/** Joins one or more names: "A", "A and B", "A, B and C". */
const joinNames = (names: string[]): string =>
  names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** The deck's states that are on the map, each with its closest few for wrong answers. */
const withNearest = (geography: UnitedStatesGeography, regions: string[] | undefined) => {
  const states = statesIn(geography, regions).filter((state) => hasState(state.name));
  return states.map((state) => ({
    state,
    nearest: states
      .filter((other) => other.name !== state.name)
      .sort((a, b) => stateDistance(state.name, a.name) - stateDistance(state.name, b.name))
      .slice(0, geography.nearbyStates)
  }));
};

const wrongFrom = (nearest: GeographyState[], wrongChoices: number, answerOf: (state: GeographyState) => string) =>
  shuffle(nearest)
    .slice(0, wrongChoices)
    .map(answerOf);

const buildHint = (state: GeographyState, deckNames: Set<string>, stateNames: Set<string>): string => {
  const firstLetter = `It starts with "${state.name[0]}"`;
  const borders = neighborNamesOf(state.name).filter((name) => stateNames.has(name));
  const sameDeck = borders.filter((name) => deckNames.has(name));
  const shown = shuffle(sameDeck.length > 0 ? sameDeck : borders).slice(0, 2);
  return shown.length > 0
    ? `${firstLetter} and borders ${joinNames(shown)}.`
    : `${firstLetter} and borders no other state.`;
};

/**
 * One map card per state in `regions` (every state when left out). Hints can name a bordering
 * state from any region, but prefer ones in the same deck.
 */
export const createStatesDeck = (
  geography: UnitedStatesGeography,
  regions: string[] | undefined,
  info: DeckInfo,
  wrongChoices: number
): GeographyDeck => {
  const entries = withNearest(geography, regions);
  const stateNames = new Set(geography.unitedStates.map((state) => state.name));
  const deckNames = new Set(entries.map(({ state }) => state.name));
  const cards = entries.map(({ state, nearest }): Card => ({
    prompt: geography.stateQuestion,
    answers: [state.name],
    choices: shuffle([state.name, ...wrongFrom(nearest, wrongChoices, (other) => other.name)]),
    hint: buildHint(state, deckNames, stateNames),
    map: { state: state.name }
  }));
  return { subject: "geography", grade: info.grade, unitLabel: info.unitLabel, cards };
};

/** One card per state in `regions` asking for its capital, with the state highlighted and the capital marked. */
export const createStateCapitalsDeck = (
  geography: UnitedStatesGeography,
  regions: string[] | undefined,
  info: DeckInfo,
  wrongChoices: number
): GeographyDeck => {
  const cards = withNearest(geography, regions).map(({ state, nearest }): Card => ({
    prompt: geography.capitalQuestion.replace("{state}", state.name),
    answers: [state.capital],
    choices: shuffle([state.capital, ...wrongFrom(nearest, wrongChoices, (other) => other.capital)]),
    hint: `It starts with "${state.capital[0]}".`,
    map: { state: state.name, capital: state.capitalCoordinates }
  }));
  return { subject: "geography", grade: info.grade, unitLabel: info.unitLabel, cards };
};
