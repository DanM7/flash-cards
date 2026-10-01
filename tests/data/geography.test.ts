import { geoBounds } from "d3-geo";
import { describe, expect, it } from "vitest";
import {
  __testing,
  countryDistance,
  hasCountry,
  markerAt,
  neighborIdsOf,
  renderCountryMap,
  sphericalArea,
  viewBoxAt,
  type CountryMapRender
} from "../../src/data/subjects/geography/atlas";
import type { DeckBuild } from "../../src/data/CardTypes";
import { unitsFor } from "../../src/data/decks";
import { createCountriesDeck } from "../../src/data/subjects/geography/countriesDeck";
import { flashcardsIn } from "../../src/data/fromFlashcards";
import { flashcardData, flashcards } from "../helpers/flashcards";

const FRANCE = "250";
const NAURU = "520";
const GREENLAND = "304";
const NEW_ZEALAND = "554";
const MALAYSIA = "458";

/** Every x,y point in an SVG path from d3-geo. */
const pathPoints = (d: string): [number, number][] =>
  [...d.matchAll(/(-?[\d.]+(?:e-?\d+)?),(-?[\d.]+(?:e-?\d+)?)/g)].map((match) => [Number(match[1]), Number(match[2])]);

const info = { grade: 6, unitLabel: "Label" };
const choices = { wrongChoices: 3, nearbyCountries: 6 };

const deckFor = (category: string) => createCountriesDeck(flashcards, [`geography-${category}`], info, choices);

/** The regional geography units in flashcards.json, without the final. */
const regionalUnits = (unitsFor(flashcardData, 6, "geography") ?? [])
  .filter((unit) => unit.label !== "Final")
  .map((unit) => (unit.option?.build as Extract<DeckBuild, { type: "countries" }>).categories);

describe("geography units", () => {
  it("cover 194 countries, each once in one unit, all present in the map data", () => {
    expect(regionalUnits).toHaveLength(11);
    const ids = regionalUnits.flatMap((categories) => {
      expect(categories).toHaveLength(1);
      return flashcardsIn(flashcards, categories[0]).map((card) => card.countryId as string);
    });
    expect(ids).toHaveLength(194);
    expect(new Set(ids).size).toBe(194);
    expect(ids.every(hasCountry)).toBe(true);
  });

  it("give every country a continent for the zoomed-out map", () => {
    const countries = flashcards.filter((card) => card.countryId);
    expect(countries.every((card) => card.continent)).toBe(true);
  });
});

describe("createCountriesDeck", () => {
  it("builds one map card per country with nearby wrong answers from the same deck", () => {
    for (const [category] of regionalUnits) {
      const deck = createCountriesDeck(flashcards, [category], info, choices);
      const countries = flashcardsIn(flashcards, category);
      const names = new Set(countries.map((card) => card.answer));
      expect(deck).toMatchObject({ subject: "geography", grade: 6, unitLabel: "Label" });
      expect(deck.cards).toHaveLength(names.size);
      for (const card of deck.cards) {
        expect(card.prompt).toBe("Which country is highlighted?");
        expect(card.map?.countryId).toBeTruthy();
        expect(card.map?.continent).toBe(countries[0].continent);
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices?.every((choice) => names.has(choice))).toBe(true);
        expect(card.hint).toMatch(new RegExp(`^It starts with "${card.answers[0][0]}"`));
      }
    }
  });

  it("hints with bordering countries, preferring ones in the same deck", () => {
    const hintFor = (category: string, name: string) =>
      deckFor(category).cards.find((card) => card.answers[0] === name)?.hint;

    expect(hintFor("europe-west", "Portugal")).toBe('It starts with "P" and borders Spain.');
    expect(hintFor("europe-west", "Iceland")).toBe('It starts with "I" and has no land borders.');
    // Papua New Guinea's only neighbor, Indonesia, is in another unit.
    expect(hintFor("oceania", "Papua New Guinea")).toBe('It starts with "P" and borders Indonesia.');
    expect(hintFor("europe-west", "France")).toMatch(/^It starts with "F" and borders \S.* and \S/);
  });

  it("builds no cards for a category without countries", () => {
    expect(deckFor("atlantis").cards).toEqual([]);
  });

  it("builds one deck from several categories", () => {
    const deck = createCountriesDeck(flashcards, regionalUnits.flat(), info, choices);
    expect(new Set(deck.cards.map((card) => card.answers[0])).size).toBe(194);
  });

  it("follows the wrong-answer count and nearby-country pool it's given", () => {
    const deck = createCountriesDeck(flashcards, ["geography-europe-west"], info, {
      wrongChoices: 1,
      nearbyCountries: 1
    });
    const portugal = deck.cards.find((card) => card.answers[0] === "Portugal");
    expect(portugal?.choices).toHaveLength(2);
    expect(portugal?.choices).toEqual(expect.arrayContaining(["Portugal", "Spain"]));
  });
});

describe("atlas lookups", () => {
  it("knows which countries it has", () => {
    expect(hasCountry(FRANCE)).toBe(true);
    expect(hasCountry("999")).toBe(false);
  });

  it("measures distance between countries, or infinity when one is unknown", () => {
    expect(countryDistance(FRANCE, "724")).toBeLessThan(countryDistance(FRANCE, "036"));
    expect(countryDistance("999", FRANCE)).toBe(Number.POSITIVE_INFINITY);
    expect(countryDistance(FRANCE, "999")).toBe(Number.POSITIVE_INFINITY);
  });

  it("lists land neighbors, skipping unnamed regions and the country's own parts", () => {
    expect(neighborIdsOf(FRANCE)).toEqual(expect.arrayContaining(["724", "276", "380"]));
    // Somaliland (no ISO id) borders Ethiopia but is shaded as part of Somalia.
    expect(neighborIdsOf("231")).toContain("706");
    expect(neighborIdsOf("706")).not.toContain("706");
    expect(neighborIdsOf("999")).toEqual([]);
  });

  it("measures polygon area the same whichever way the ring winds", () => {
    const ring = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0]
    ];
    const area = sphericalArea([ring]);
    expect(area).toBeGreaterThan(0);
    expect(area).toBeLessThan(0.001);
    expect(sphericalArea([[...ring].reverse()])).toBeCloseTo(area, 10);
  });
});

describe("renderCountryMap", () => {
  it("returns null for an unknown country", () => {
    expect(renderCountryMap("999", 600, 400)).toBeNull();
  });

  it("renders large, spread-out, and far-flung countries", () => {
    // Russia, the USA, Fiji (straddles 180°), and Kiribati (far from most of Oceania's frame).
    for (const id of ["643", "840", "242", "296"]) {
      expect(renderCountryMap(id, 600, 400)?.targetPath, id).toMatch(/^M/);
    }
  });

  it("draws the country separately from the rest of the land, inside a continent-wide overview", () => {
    const render = renderCountryMap(FRANCE, 600, 400, "europe") as CountryMapRender;
    expect(render.width).toBe(600);
    expect(render.targetPath.length).toBeGreaterThan(0);
    expect(render.landPath.length).toBeGreaterThan(render.targetPath.length);
    expect(render.spherePath.length).toBeGreaterThan(0);
    expect(render.overview.width).toBeGreaterThan(600);
    expect(render.overview.width / render.overview.height).toBeCloseTo(1.5, 5);
    expect(render.overview.x).toBeLessThanOrEqual(render.focus.x);
    expect(render.overview.x + render.overview.width).toBeGreaterThanOrEqual(render.focus.x + render.focus.width);
  });

  it("uses the country view as the overview when there's no continent", () => {
    const render = renderCountryMap(GREENLAND, 600, 400) as CountryMapRender;
    expect(render.overview.width).toBeCloseTo(600 * 1.06, 5);
  });

  it("marks tiny countries until the view is zoomed in enough to see them", () => {
    const nauru = renderCountryMap(NAURU, 600, 400, "oceania") as CountryMapRender;
    const marker = markerAt(nauru, viewBoxAt(nauru, 0, 1.5));
    expect(marker?.r).toBe(18);
    expect(marker?.cx).toBeCloseTo(300, 0);
    expect(marker?.cy).toBeCloseTo(200, 0);
    expect(markerAt(nauru, viewBoxAt(nauru, 1, 1.5))?.r).toBeGreaterThan(18);

    const france = renderCountryMap(FRANCE, 600, 400) as CountryMapRender;
    expect(markerAt(france, viewBoxAt(france, 0, 1.5))).toBeNull();
  });

  it("keeps a country with parts far apart entirely in view, whatever the window's shape", () => {
    const malaysia = renderCountryMap(MALAYSIA, 600, 400, "asia") as CountryMapRender;
    const points = pathPoints(malaysia.targetPath);
    expect(points.length).toBeGreaterThan(100);
    for (const aspect of [1.5, 3]) {
      const view = viewBoxAt(malaysia, 0, aspect);
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(view.x);
        expect(x).toBeLessThanOrEqual(view.x + view.width);
        expect(y).toBeGreaterThanOrEqual(view.y);
        expect(y).toBeLessThanOrEqual(view.y + view.height);
      }
    }
  });

  it("draws extra map to the sides, so wide windows aren't left blank", () => {
    const france = renderCountryMap(FRANCE, 600, 400, "europe") as CountryMapRender;
    const xs = pathPoints(france.landPath).map(([x]) => x);
    expect(Math.min(...xs)).toBeLessThan(france.overview.x - france.overview.width / 4);
    expect(Math.max(...xs)).toBeGreaterThan(france.overview.x + france.overview.width * 1.25);
  });
});

describe("country framing", () => {
  it("keeps both of New Zealand's main islands but not the far-off Chatham Islands", () => {
    const [[west, south], [east, north]] = geoBounds(__testing.bodyOf(NEW_ZEALAND));
    expect(south).toBeLessThan(-46);
    expect(north).toBeGreaterThan(-35);
    expect(west).toBeGreaterThan(165);
    expect(east).toBeLessThan(179);
  });

  it("keeps both halves of Malaysia", () => {
    const [[west], [east]] = geoBounds(__testing.bodyOf(MALAYSIA));
    expect(west).toBeLessThan(101);
    expect(east).toBeGreaterThan(118);
  });

  it("leaves out overseas territories but keeps nearby islands like Corsica", () => {
    const body = __testing.bodyOf(FRANCE);
    const [[west, south], [east]] = geoBounds(body);
    expect(west).toBeGreaterThan(-6);
    expect(east).toBeGreaterThan(9);
    expect(south).toBeLessThan(42);
    expect(south).toBeGreaterThan(41);
  });
});

describe("viewBoxAt", () => {
  const render = (overview: CountryMapRender["overview"]): CountryMapRender => ({
    width: 600,
    height: 400,
    overview,
    spherePath: "",
    landPath: "",
    targetPath: "",
    focus: { x: 0, y: 0, width: 10, height: 10 },
    center: { x: 300, y: 200 }
  });

  it("moves from the country view to the overview, changing width geometrically", () => {
    const map = render({ x: -300, y: -200, width: 2400, height: 1600 });
    expect(viewBoxAt(map, 0, 1.5)).toEqual({ x: 0, y: 0, width: 600, height: 400 });
    expect(viewBoxAt(map, 1, 1.5)).toEqual({ x: -300, y: -200, width: 2400, height: 1600 });
    expect(viewBoxAt(map, 0.5, 1.5).width).toBeCloseTo(1200, 5);
  });

  it("pans in step with zoom when the overview is the same width as the country view", () => {
    const map = render({ x: 100, y: 0, width: 600, height: 400 });
    expect(viewBoxAt(map, 0.5, 1.5)).toEqual({ x: 50, y: 0, width: 600, height: 400 });
  });

  it("widens or heightens the view to the window's shape without cropping", () => {
    const map = render({ x: -300, y: -200, width: 2400, height: 1600 });
    expect(viewBoxAt(map, 0, 3)).toEqual({ x: -300, y: 0, width: 1200, height: 400 });
    expect(viewBoxAt(map, 0, 1)).toEqual({ x: 0, y: -100, width: 600, height: 600 });
  });
});
