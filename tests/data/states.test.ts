import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import usData from "us-atlas/states-10m.json";
import { describe, expect, it } from "vitest";
import type { Card } from "../../src/data/CardTypes";
import { statesIn } from "../../src/data/subjects/geography/states";
import { createStateCapitalsDeck, createStatesDeck } from "../../src/data/subjects/geography/statesDeck";
import {
  hasState,
  neighborNamesOf,
  renderStateMap,
  stateDistance
} from "../../src/data/subjects/geography/usAtlas";
import { flashcardData } from "../helpers/flashcards";

const { geography } = flashcardData.subjectData;
const info = { grade: 4, unitLabel: "Label" };
const REGIONS = ["northeast", "southeast", "midwest", "southwest", "west"];

const topology = usData as unknown as Topology<{ states: GeometryCollection<{ name: string }> }>;
const shapes = feature(topology, topology.objects.states).features;

const byAnswer = (cards: Card[], answer: string) => cards.find((card) => card.answers[0] === answer) as Card;

describe("U.S. states data", () => {
  it("lists all 50 states once, each in one of five regions and on the map", () => {
    const { unitedStates } = geography;
    expect(unitedStates).toHaveLength(50);
    expect(new Set(unitedStates.map((state) => state.name)).size).toBe(50);
    expect(unitedStates.every((state) => hasState(state.name))).toBe(true);
    expect(new Set(unitedStates.map((state) => state.region))).toEqual(new Set(REGIONS));
    expect(REGIONS.map((region) => statesIn(geography, [region]).length)).toEqual([11, 12, 12, 4, 11]);
    expect(statesIn(geography, undefined)).toBe(unitedStates);
  });

  it("names a different capital for every state, each placed inside its state", () => {
    const { unitedStates } = geography;
    expect(new Set(unitedStates.map((state) => state.capital)).size).toBe(50);
    for (const state of unitedStates) {
      const shape = shapes.find((entry) => entry.properties.name === state.name);
      expect(shape && geoContains(shape, state.capitalCoordinates), `${state.capital}, ${state.name}`).toBe(true);
    }
    const capitalOf = (name: string) => unitedStates.find((state) => state.name === name)?.capital;
    expect(capitalOf("Texas")).toBe("Austin");
    expect(capitalOf("New York")).toBe("Albany");
  });
});

describe("usAtlas", () => {
  it("knows which states border each other and how far apart they are", () => {
    expect(neighborNamesOf("Texas").sort()).toEqual(["Arkansas", "Louisiana", "New Mexico", "Oklahoma"]);
    expect(neighborNamesOf("Hawaii")).toEqual([]);
    expect(neighborNamesOf("Atlantis")).toEqual([]);
    expect(stateDistance("Texas", "Oklahoma")).toBeLessThan(stateDistance("Texas", "Maine"));
    expect(stateDistance("Atlantis", "Texas")).toBe(Number.POSITIVE_INFINITY);
    expect(stateDistance("Texas", "Atlantis")).toBe(Number.POSITIVE_INFINITY);
  });

  it("centers the state, zooms out to the whole country, and marks the capital", () => {
    const texas = renderStateMap("Texas", 600, 400, [-97.743, 30.267]);
    expect(texas).not.toBeNull();
    const map = texas as NonNullable<typeof texas>;
    expect(map.center.x).toBeCloseTo(300, 5);
    expect(map.center.y).toBeCloseTo(200, 5);
    expect(map.overview.width).toBeGreaterThan(map.focus.width * 3);
    expect(map.overview.width / map.overview.height).toBeCloseTo(1.5, 5);
    expect(map.targetPath).toMatch(/^M/);
    expect(map.landPath).toMatch(/^M/);
    const capital = map.capital as { x: number; y: number };
    expect(capital.x).toBeGreaterThan(map.focus.x);
    expect(capital.x).toBeLessThan(map.focus.x + map.focus.width);
    expect(capital.y).toBeGreaterThan(map.focus.y);
    expect(capital.y).toBeLessThan(map.focus.y + map.focus.height);
  });

  it("keeps small states in view of their neighbors", () => {
    const rhodeIsland = renderStateMap("Rhode Island", 600, 400);
    expect(rhodeIsland?.focus.width).toBeLessThan(100);
    expect(rhodeIsland).not.toHaveProperty("capital");
  });

  it("leaves out a capital the map can't place, and draws nothing for an unknown state", () => {
    expect(renderStateMap("Texas", 600, 400, [0, 0])).not.toHaveProperty("capital");
    expect(renderStateMap("Atlantis", 600, 400)).toBeNull();
  });
});

describe("createStatesDeck", () => {
  it("builds one map card per state with nearby wrong answers and border hints", () => {
    const deck = createStatesDeck(geography, undefined, info, 3);
    expect(deck).toMatchObject({ subject: "geography", grade: 4, unitLabel: "Label" });
    expect(deck.cards).toHaveLength(50);
    for (const card of deck.cards) {
      expect(card.prompt).toBe("Which state is highlighted?");
      expect(card.map).toEqual({ state: card.answers[0] });
      expect(card.choices).toHaveLength(4);
      expect(card.choices).toContain(card.answers[0]);
    }
    expect(byAnswer(deck.cards, "Texas").hint).toMatch(/^It starts with "T" and borders \w[\w ]* and \w[\w ]*\.$/);
    expect(byAnswer(deck.cards, "Hawaii").hint).toBe('It starts with "H" and borders no other state.');
    const maineChoices = byAnswer(deck.cards, "Maine").choices ?? [];
    const nearMaine = ["Maine", "New Hampshire", "Vermont", "Massachusetts", "Rhode Island", "Connecticut", "New York"];
    expect(maineChoices.every((name) => nearMaine.includes(name))).toBe(true);
  });

  it("quizzes one region, borrowing a bordering state from outside it for the hint when needed", () => {
    const deck = createStatesDeck(geography, ["southwest"], info, 3);
    expect(deck.cards.map((card) => card.answers[0]).sort()).toEqual(["Arizona", "New Mexico", "Oklahoma", "Texas"]);
    const solo = {
      ...geography,
      unitedStates: geography.unitedStates.map((state) => (state.name === "Maine" ? { ...state, region: "solo" } : state))
    };
    expect(createStatesDeck(solo, ["solo"], info, 3).cards[0]).toMatchObject({
      answers: ["Maine"],
      choices: ["Maine"],
      hint: 'It starts with "M" and borders New Hampshire.'
    });
  });

  it("skips states the map doesn't have", () => {
    const withUnknown = {
      ...geography,
      unitedStates: [
        ...statesIn(geography, ["southwest"]),
        { name: "Atlantis", capital: "Poseidonia", region: "southwest", capitalCoordinates: [0, 0] as [number, number] }
      ]
    };
    expect(createStatesDeck(withUnknown, ["southwest"], info, 3).cards).toHaveLength(4);
  });
});

describe("createStateCapitalsDeck", () => {
  it("asks for each state's capital, with the state shown and its capital marked", () => {
    const deck = createStateCapitalsDeck(geography, undefined, info, 3);
    expect(deck.cards).toHaveLength(50);
    const texas = byAnswer(deck.cards, "Austin");
    expect(texas).toMatchObject({
      prompt: "What is the capital of Texas?",
      hint: 'It starts with "A".',
      map: { state: "Texas", capital: [-97.743, 30.267] }
    });
    const capitals = new Set(geography.unitedStates.map((state) => state.capital));
    for (const card of deck.cards) {
      expect(card.choices).toHaveLength(4);
      expect(card.choices).toContain(card.answers[0]);
      expect(card.choices?.every((choice) => capitals.has(choice))).toBe(true);
    }
  });

  it("quizzes one region", () => {
    const deck = createStateCapitalsDeck(geography, ["southwest"], info, 3);
    expect(deck.cards.map((card) => card.answers[0]).sort()).toEqual(["Austin", "Oklahoma City", "Phoenix", "Santa Fe"]);
  });
});
