import { describe, expect, it } from "vitest";
import {
  countryDistance,
  hasCountry,
  markerAt,
  neighborIdsOf,
  renderCountryMap,
  sphericalArea,
  viewBoxAt,
  type CountryMapRender
} from "../../src/data/subjects/geography/atlas";
import { GEOGRAPHY_UNITS } from "../../src/data/subjects/geography/countries";
import { createCountriesDeck, createFinalCountriesDeck } from "../../src/data/subjects/geography/grade6";

const FRANCE = "250";
const NAURU = "520";
const GREENLAND = "304";

describe("geography units", () => {
  it("cover 194 countries, each once, all present in the map data", () => {
    const ids = GEOGRAPHY_UNITS.flatMap((unit) => unit.countries.map((country) => country.id));
    expect(ids).toHaveLength(194);
    expect(new Set(ids).size).toBe(194);
    expect(ids.every(hasCountry)).toBe(true);
    expect(GEOGRAPHY_UNITS.map((unit) => unit.unit)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe("createCountriesDeck", () => {
  it("builds one map card per country with nearby wrong answers from the same unit", () => {
    for (const unit of GEOGRAPHY_UNITS) {
      const deck = createCountriesDeck(unit.id);
      const names = new Set(unit.countries.map((country) => country.name));
      expect(deck).toMatchObject({ subject: "geography", grade: 6, unitLabel: `Unit ${unit.unit}: ${unit.title}` });
      expect(deck.cards).toHaveLength(unit.countries.length);
      for (const card of deck.cards) {
        expect(card.prompt).toBe("Which country is highlighted?");
        expect(card.map?.countryId).toBeTruthy();
        expect(new Set(card.choices).size).toBe(4);
        expect(card.choices?.every((choice) => names.has(choice))).toBe(true);
        expect(card.hint).toMatch(new RegExp(`^It starts with "${card.answers[0][0]}"`));
      }
    }
  });

  it("hints with bordering countries, preferring ones in the same unit", () => {
    const hintFor = (unitId: string, name: string) =>
      createCountriesDeck(unitId).cards.find((card) => card.answers[0] === name)?.hint;

    expect(hintFor("europe-west", "Portugal")).toBe('It starts with "P" and borders Spain.');
    expect(hintFor("europe-west", "Iceland")).toBe('It starts with "I" and has no land borders.');
    // Papua New Guinea's only neighbor, Indonesia, is in another unit.
    expect(hintFor("oceania", "Papua New Guinea")).toBe('It starts with "P" and borders Indonesia.');
    expect(hintFor("europe-west", "France")).toMatch(/^It starts with "F" and borders \S.* and \S/);
  });

  it("rejects an unknown unit", () => {
    expect(() => createCountriesDeck("atlantis")).toThrow('Unknown geography unit "atlantis".');
  });

  it("builds a final deck with every country", () => {
    const deck = createFinalCountriesDeck();
    expect(deck.unitLabel).toBe("Final: All Countries");
    expect(new Set(deck.cards.map((card) => card.answers[0])).size).toBe(194);
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
    const render = renderCountryMap(FRANCE, 600, 400) as CountryMapRender;
    expect(render.width).toBe(600);
    expect(render.targetPath.length).toBeGreaterThan(0);
    expect(render.landPath.length).toBeGreaterThan(render.targetPath.length);
    expect(render.spherePath.length).toBeGreaterThan(0);
    expect(render.overview.width).toBeGreaterThan(600);
    expect(render.overview.width / render.overview.height).toBeCloseTo(1.5, 5);
    expect(render.overview.x).toBeLessThanOrEqual(render.focus.x);
    expect(render.overview.x + render.overview.width).toBeGreaterThanOrEqual(render.focus.x + render.focus.width);
  });

  it("uses the country view as the overview for places outside every unit", () => {
    const render = renderCountryMap(GREENLAND, 600, 400) as CountryMapRender;
    expect(render.overview.width).toBeCloseTo(600 * 1.06, 5);
  });

  it("marks tiny countries until the view is zoomed in enough to see them", () => {
    const nauru = renderCountryMap(NAURU, 600, 400) as CountryMapRender;
    const marker = markerAt(nauru, viewBoxAt(nauru, 0));
    expect(marker).toEqual({ cx: 300, cy: 200, r: 18 });
    expect(markerAt(nauru, viewBoxAt(nauru, 1))?.r).toBeGreaterThan(18);

    const france = renderCountryMap(FRANCE, 600, 400) as CountryMapRender;
    expect(markerAt(france, viewBoxAt(france, 0))).toBeNull();
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
    expect(viewBoxAt(map, 0)).toEqual({ x: 0, y: 0, width: 600, height: 400 });
    expect(viewBoxAt(map, 1)).toEqual({ x: -300, y: -200, width: 2400, height: 1600 });
    expect(viewBoxAt(map, 0.5).width).toBeCloseTo(1200, 5);
  });

  it("pans in step with zoom when the overview is the same width as the country view", () => {
    const map = render({ x: 100, y: 0, width: 600, height: 400 });
    expect(viewBoxAt(map, 0.5)).toEqual({ x: 50, y: 0, width: 600, height: 400 });
  });
});
