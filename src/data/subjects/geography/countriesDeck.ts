import type { Card, DeckInfo, Flashcard, GeographyDeck } from "../../CardTypes";
import { countryDistance, hasCountry, neighborIdsOf, type Continent } from "./atlas";

export interface CountryChoices {
  /** Wrong answers per card. */
  wrongChoices: number;
  /** Wrong answers are picked from this many of the closest countries in the same deck. */
  nearbyCountries: number;
}

interface Country {
  /** ISO 3166-1 numeric code, matching the map data. */
  id: string;
  name: string;
  question: string;
  continent?: Continent;
}

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const toCountry = (flashcard: Flashcard): Country => ({
  id: flashcard.countryId as string,
  name: flashcard.answer,
  question: flashcard.question,
  continent: flashcard.continent
});

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
 * One map card per country in `categories`. Hints can name a bordering country from any
 * category, but prefer ones in the same deck.
 */
export const createCountriesDeck = (
  flashcards: Flashcard[],
  categories: string[],
  info: DeckInfo,
  choices: CountryChoices
): GeographyDeck => {
  const allCountries = flashcards.filter((flashcard) => flashcard.countryId).map(toCountry);
  const nameById = new Map(allCountries.map((country) => [country.id, country.name]));
  const countries = flashcards
    .filter((flashcard) => flashcard.countryId && categories.includes(flashcard.category as string))
    .map(toCountry)
    .filter((country) => hasCountry(country.id));
  const deckIds = new Set(countries.map((country) => country.id));

  const cards = countries.map((country): Card => {
    const nearest = countries
      .filter((other) => other.id !== country.id)
      .sort((a, b) => countryDistance(country.id, a.id) - countryDistance(country.id, b.id))
      .slice(0, choices.nearbyCountries);
    const wrong = shuffle(nearest)
      .slice(0, choices.wrongChoices)
      .map((other) => other.name);
    return {
      prompt: country.question,
      answers: [country.name],
      choices: shuffle([country.name, ...wrong]),
      hint: buildHint(country, deckIds, nameById),
      map: { countryId: country.id, continent: country.continent }
    };
  });

  return { subject: "geography", grade: info.grade, unitLabel: info.unitLabel, cards };
};
