import type { Card, DeckInfo, GeographyDeck } from "../../CardTypes";
import { countryDistance, hasCountry, neighborIdsOf, type Continent } from "./atlas";

export interface GeographyCountry {
  name: string;
  /** ISO 3166-1 numeric id, matching the map data. */
  id: string;
  capital: string;
}

export interface GeographyRegion {
  /** The map zooms out to this continent at the widest. */
  continent: Continent;
  countries: GeographyCountry[];
}

export interface Geography {
  /** Wrong answers on a map card come from this many of the closest countries in the deck. */
  nearbyCountries: number;
  /** Asked on every map card. */
  question: string;
  regions: Record<string, GeographyRegion>;
}

interface Country {
  id: string;
  name: string;
  continent: Continent;
}

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const countriesIn = (region: GeographyRegion): Country[] =>
  region.countries.map(({ id, name }) => ({ id, name, continent: region.continent }));

/** Joins one or more names: "A", "A and B", "A, B and C". */
const joinNames = (names: string[]): string =>
  names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const buildHint = (country: Country, deckIds: Set<string>, nameById: Map<string, string>): string => {
  const firstLetter = `It starts with "${country.name[0]}"`;
  const borders = neighborIdsOf(country.id).filter((id) => nameById.has(id));
  const sameDeck = borders.filter((id) => deckIds.has(id));
  const shown = shuffle(sameDeck.length > 0 ? sameDeck : borders)
    .slice(0, 2)
    .map((id) => nameById.get(id) as string);
  return shown.length > 0
    ? `${firstLetter} and borders ${joinNames(shown)}.`
    : `${firstLetter} and has no land borders.`;
};

/**
 * One map card per country in `regions` (every region when left out). Hints can name a bordering
 * country from any region, but prefer ones in the same deck.
 */
export const createCountriesDeck = (
  geography: Geography,
  regions: string[] | undefined,
  info: DeckInfo,
  wrongChoices: number
): GeographyDeck => {
  const allCountries = Object.values(geography.regions).flatMap(countriesIn);
  const nameById = new Map(allCountries.map((country) => [country.id, country.name]));
  const countries = (regions ?? Object.keys(geography.regions))
    .flatMap((key) => (geography.regions[key] ? countriesIn(geography.regions[key]) : []))
    .filter((country) => hasCountry(country.id));
  const deckIds = new Set(countries.map((country) => country.id));

  const cards = countries.map((country): Card => {
    const nearest = countries
      .filter((other) => other.id !== country.id)
      .sort((a, b) => countryDistance(country.id, a.id) - countryDistance(country.id, b.id))
      .slice(0, geography.nearbyCountries);
    const wrong = shuffle(nearest)
      .slice(0, wrongChoices)
      .map((other) => other.name);
    return {
      prompt: geography.question,
      answers: [country.name],
      choices: shuffle([country.name, ...wrong]),
      hint: buildHint(country, deckIds, nameById),
      map: { countryId: country.id, continent: country.continent }
    };
  });

  return { subject: "geography", grade: info.grade, unitLabel: info.unitLabel, cards };
};
