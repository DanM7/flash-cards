import type { Card, GeographyDeck } from "../../CardTypes";
import { countryDistance, hasCountry, neighborIdsOf } from "./atlas";
import { CONTINENTS, type Continent, type Country } from "./countries";

/** Wrong answers come from this many of the closest countries on the same continent. */
const NEAREST_POOL = 6;

const nameById = new Map(CONTINENTS.flatMap((group) => group.countries.map((country) => [country.id, country.name])));

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const joinNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const buildHint = (country: Country, continentIds: Set<string>): string => {
  const firstLetter = `It starts with "${country.name[0]}"`;
  const borders = neighborIdsOf(country.id).filter((id) => nameById.has(id));
  const sameContinent = borders.filter((id) => continentIds.has(id));
  const shown = shuffle(sameContinent.length > 0 ? sameContinent : borders)
    .slice(0, 2)
    .map((id) => nameById.get(id) as string);
  return shown.length > 0
    ? `${firstLetter} and borders ${joinNames(shown)}.`
    : `${firstLetter} and has no land borders.`;
};

export const createCountriesDeck = (continent: Continent): GeographyDeck => {
  const group = CONTINENTS.find((candidate) => candidate.id === continent);
  if (!group) {
    throw new Error(`Unknown continent "${continent}".`);
  }
  const countries = group.countries.filter((country) => hasCountry(country.id));
  const continentIds = new Set(countries.map((country) => country.id));

  const cards: Card[] = countries.map((country) => {
    const nearest = countries
      .filter((other) => other.id !== country.id)
      .sort((a, b) => countryDistance(country.id, a.id) - countryDistance(country.id, b.id))
      .slice(0, NEAREST_POOL);
    const wrong = shuffle(nearest)
      .slice(0, 3)
      .map((other) => other.name);
    return {
      prompt: "Which country is highlighted?",
      answers: [country.name],
      choices: shuffle([country.name, ...wrong]),
      hint: buildHint(country, continentIds),
      map: { countryId: country.id }
    };
  });

  return {
    subject: "geography",
    grade: 6,
    unitLabel: `Unit ${group.unit}: ${group.title}`,
    cards
  };
};
