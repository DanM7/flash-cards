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
import { flashcardData } from "../helpers/flashcards";

const FRANCE = "250";
const NAURU = "520";
const GREENLAND = "304";
const NEW_ZEALAND = "554";
const MALAYSIA = "458";

/** Every x,y point in an SVG path from d3-geo. */
const pathPoints = (d: string): [number, number][] =>
  [...d.matchAll(/(-?[\d.]+(?:e-?\d+)?),(-?[\d.]+(?:e-?\d+)?)/g)].map((match) => [Number(match[1]), Number(match[2])]);

const info = { grade: 6, unitLabel: "Label" };
const { geography } = flashcardData.subjectData;

const deckFor = (region: string) => createCountriesDeck(geography, [region], info, 3);

/** The regions of the regional geography units in flashcards.json, without the final. */
const regionalUnits = (unitsFor(flashcardData, 6, "geography") ?? [])
  .filter((unit) => unit.label !== "Final")
  .map((unit) => (unit.option?.build as Extract<DeckBuild, { type: "countries" }>).regions ?? []);

describe("geography units", () => {
  it("cover 194 countries, each once in one unit, all present in the map data", () => {
    expect(regionalUnits).toHaveLength(11);
    const ids = regionalUnits.flatMap((regions) => {
      expect(regions).toHaveLength(1);
      return geography.regions[regions[0]].countries.map((country) => country.id);
    });
    expect(ids).toHaveLength(194);
    expect(new Set(ids).size).toBe(194);
    expect(ids.every(hasCountry)).toBe(true);
  });

  it("name every country's capital", () => {
    const countries = Object.values(geography.regions).flatMap((region) => region.countries);
    expect(new Set(countries.map((country) => country.name)).size).toBe(countries.length);
    for (const country of countries) {
      expect(country.capital.trim(), country.name).not.toBe("");
    }
    const capitalOf = (name: string) => countries.find((country) => country.name === name)?.capital;
    expect(capitalOf("France")).toBe("Paris");
    expect(capitalOf("Australia")).toBe("Canberra");
  });

  it("include every region, with the final drawing from all of them", () => {
    expect(regionalUnits.flat().sort()).toEqual(Object.keys(geography.regions).sort());
    const final = unitsFor(flashcardData, 6, "geography")?.find((unit) => unit.label === "Final");
    expect(final?.option?.build).toEqual({ type: "countries" });
  });
});

describe("createCountriesDeck", () => {
  it("builds one map card per country with nearby wrong answers from the same deck", () => {
    for (const [region] of regionalUnits) {
      const deck = deckFor(region);
      const { continent, countries } = geography.regions[region];
      const idByName = new Map(countries.map((country) => [country.name, country.id]));
      const names = new Set(idByName.keys());
      expect(deck).toMatchObject({ subject: "geography", grade: 6, unitLabel: "Label" });
      expect(deck.cards).toHaveLength(names.size);
      for (const card of deck.cards) {
        expect(card.prompt).toBe(geography.question);
        expect(card.map).toEqual({ countryId: idByName.get(card.answers[0]), continent });
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices?.every((choice) => names.has(choice))).toBe(true);
        expect(card.hint).toMatch(new RegExp(`^It starts with "${card.answers[0][0]}"`));
      }
    }
  });

  it("hints with bordering countries, preferring ones in the same deck", () => {
    const hintFor = (region: string, name: string) =>
      deckFor(region).cards.find((card) => card.answers[0] === name)?.hint;

    expect(hintFor("europe-west", "Portugal")).toBe('It starts with "P" and borders Spain.');
    expect(hintFor("europe-west", "Iceland")).toBe('It starts with "I" and has no land borders.');
    // Papua New Guinea's only neighbor, Indonesia, is in another unit.
    expect(hintFor("oceania", "Papua New Guinea")).toBe('It starts with "P" and borders Indonesia.');
    expect(hintFor("europe-west", "France")).toMatch(/^It starts with "F" and borders \S.* and \S/);
  });

  it("builds no cards for an unknown region, and skips countries the map doesn't have", () => {
    expect(deckFor("atlantis").cards).toEqual([]);
    const withUnknown = {
      ...geography,
      regions: {
        test: {
          continent: "europe" as const,
          countries: [
            { name: "France", id: FRANCE, capital: "Paris" },
            { name: "Nowhere", id: "999", capital: "Nowhere City" }
          ]
        }
      }
    };
    expect(createCountriesDeck(withUnknown, ["test"], info, 3).cards.map((card) => card.answers[0])).toEqual(["France"]);
  });

  it("builds one deck from every region when none are named", () => {
    const deck = createCountriesDeck(geography, undefined, info, 3);
    expect(new Set(deck.cards.map((card) => card.answers[0])).size).toBe(194);
  });

  it("follows the wrong-answer count and nearby-country pool it's given", () => {
    const deck = createCountriesDeck({ ...geography, nearbyCountries: 1 }, ["europe-west"], info, 1);
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
