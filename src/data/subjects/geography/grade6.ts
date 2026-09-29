import type { Card, GeographyDeck } from "../../CardTypes";
import { countryDistance, hasCountry, neighborIdsOf } from "./atlas";
import { GEOGRAPHY_UNITS, type Country } from "./countries";

/** Wrong answers come from this many of the closest countries in the same unit. */
const NEAREST_POOL = 6;

const nameById = new Map(
  GEOGRAPHY_UNITS.flatMap((group) => group.countries.map((country) => [country.id, country.name]))
);

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

const buildHint = (country: Country, unitIds: Set<string>): string => {
  const firstLetter = `It starts with "${country.name[0]}"`;
  const borders = neighborIdsOf(country.id).filter((id) => nameById.has(id));
  const sameUnit = borders.filter((id) => unitIds.has(id));
  const shown = shuffle(sameUnit.length > 0 ? sameUnit : borders)
    .slice(0, 2)
    .map((id) => nameById.get(id) as string);
  return shown.length > 0
    ? `${firstLetter} and borders ${joinNames(shown)}.`
    : `${firstLetter} and has no land borders.`;
};

const buildCards = (pool: Country[]): Card[] => {
  const countries = pool.filter((country) => hasCountry(country.id));
  const unitIds = new Set(countries.map((country) => country.id));

  return countries.map((country) => {
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
      hint: buildHint(country, unitIds),
      map: { countryId: country.id }
    };
  });
};

export const createCountriesDeck = (unitId: string): GeographyDeck => {
  const group = GEOGRAPHY_UNITS.find((candidate) => candidate.id === unitId);
  if (!group) {
    throw new Error(`Unknown geography unit "${unitId}".`);
  }
  return {
    subject: "geography",
    grade: 6,
    unitLabel: `Unit ${group.unit}: ${group.title}`,
    cards: buildCards(group.countries)
  };
};

/** Every country in one deck, mixed together so no continent comes up in a block. */
export const createFinalCountriesDeck = (): GeographyDeck => ({
  subject: "geography",
  grade: 6,
  unitLabel: "Final: All Countries",
  cards: shuffle(buildCards(GEOGRAPHY_UNITS.flatMap((group) => group.countries)))
});
