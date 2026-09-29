import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CountryMap from "../../src/components/CountryMap.svelte";

vi.mock("../../src/data/subjects/geography/atlas", () => {
  throw new Error("offline");
});

describe("CountryMap when the map data can't load", () => {
  it("shows an error instead of the map", async () => {
    render(CountryMap, { countryId: "250" });
    expect(await screen.findByText("Couldn't load the map.")).toBeInTheDocument();
  });
});
