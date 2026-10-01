import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import CountryMap from "../../src/components/CountryMap.svelte";
import { installFrames, setReducedMotion } from "../helpers/animation";

const FRANCE = "250";
const NAURU = "520";

const loadedMap = async () => (await screen.findByRole("img", {}, { timeout: 15_000 })) as unknown as SVGSVGElement;
const viewBox = (svg: SVGSVGElement) => svg.getAttribute("viewBox")?.split(" ").map(Number) ?? [];

describe("CountryMap", () => {
  it("shows a loading message, then the map zoomed out on the continent", async () => {
    installFrames();
    render(CountryMap, { countryId: FRANCE, cue: "Which country is highlighted?" });
    expect(screen.getByText("Loading map…")).toBeInTheDocument();
    expect(screen.getByText("Which country is highlighted?")).toBeInTheDocument();
    const svg = await loadedMap();
    expect(viewBox(svg)[2]).toBeGreaterThan(600);
    expect(svg.querySelector(".map-card__target")?.getAttribute("d")).toMatch(/^M/);
    expect(svg.querySelector(".map-card__marker")).toBeNull();
  });

  it("uses a default cue", async () => {
    installFrames();
    render(CountryMap, { countryId: FRANCE });
    expect(screen.getByText("Name this country")).toBeInTheDocument();
    await loadedMap();
  });

  it("updates the cue text", async () => {
    installFrames();
    const { component } = render(CountryMap, { countryId: FRANCE, cue: "First" });
    await component.$set({ cue: "Second" });
    expect(screen.getByText("Second")).toBeInTheDocument();
    await loadedMap();
  });

  it("animates in to the country after a short delay", async () => {
    const frames = installFrames();
    render(CountryMap, { countryId: FRANCE });
    const svg = await loadedMap();
    const start = viewBox(svg)[2];

    frames.flush(0);
    await tick();
    expect(viewBox(svg)[2]).toBe(start);

    frames.flush(1100);
    await tick();
    const middle = viewBox(svg)[2];
    expect(middle).toBeLessThan(start);
    expect(middle).toBeGreaterThan(600);

    frames.flush(2000);
    await tick();
    expect(viewBox(svg)).toEqual([0, 0, 600, 400]);
    expect(frames.pending()).toBe(0);
  });

  it("zooms out and back in 25% at a time, disabling buttons at the limits", async () => {
    const frames = installFrames();
    render(CountryMap, { countryId: FRANCE });
    await loadedMap();
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    expect(zoomIn).toBeDisabled();

    // Clicking mid-intro cancels the intro animation and starts the step.
    await fireEvent.click(zoomOut);
    expect(frames.cancel).toHaveBeenCalled();
    for (let i = 0; i < 3; i += 1) {
      await fireEvent.click(zoomOut);
    }
    expect(zoomOut).toBeDisabled();
    expect(zoomIn).toBeEnabled();

    await fireEvent.click(zoomOut);
    await fireEvent.click(zoomIn);
    expect(zoomOut).toBeEnabled();
  });

  it("jumps straight to the target zoom when the user prefers reduced motion", async () => {
    const frames = installFrames();
    setReducedMotion(true);
    render(CountryMap, { countryId: FRANCE });
    const svg = await loadedMap();
    expect(viewBox(svg)).toEqual([0, 0, 600, 400]);
    expect(frames.pending()).toBe(0);

    await fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(viewBox(svg)[2]).toBeGreaterThan(600);
  });

  it("fits the view to the map window's shape instead of cropping", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
    installFrames();
    setReducedMotion(true);
    render(CountryMap, { countryId: FRANCE });
    const svg = await loadedMap();
    await vi.waitFor(() => expect(viewBox(svg)).toEqual([-300, 0, 1200, 400]));
    expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });

  it("circles tiny countries", async () => {
    installFrames();
    setReducedMotion(true);
    render(CountryMap, { countryId: NAURU });
    const svg = await loadedMap();
    expect(svg.querySelector(".map-card__marker")?.getAttribute("r")).toBe("18");
  });

  it("reports a country it can't draw", async () => {
    installFrames();
    render(CountryMap, { countryId: "999" });
    expect(await screen.findByText("Couldn't load the map.", {}, { timeout: 15_000 })).toBeInTheDocument();
  });

  it("only draws the latest country when the id changes mid-load", async () => {
    installFrames();
    setReducedMotion(true);
    const { component } = render(CountryMap, { countryId: "999" });
    await component.$set({ countryId: FRANCE });
    const svg = await loadedMap();
    expect(svg.querySelector(".map-card__target")?.getAttribute("d")).toMatch(/^M/);
  });

  it("redraws when the next card shows a different country", async () => {
    installFrames();
    setReducedMotion(true);
    const { component } = render(CountryMap, { countryId: FRANCE });
    const svg = await loadedMap();
    const franceTarget = svg.querySelector(".map-card__target")?.getAttribute("d");

    await component.$set({ countryId: NAURU });
    await vi.waitFor(() => expect(svg.querySelector(".map-card__marker")).not.toBeNull());
    expect(svg.querySelector(".map-card__target")?.getAttribute("d")).not.toBe(franceTarget);

    await component.$set({ countryId: "999" });
    expect(await screen.findByText("Couldn't load the map.")).toBeInTheDocument();
  });

  it("stops animating when removed", async () => {
    const frames = installFrames();
    const { unmount } = render(CountryMap, { countryId: FRANCE });
    await loadedMap();
    unmount();
    expect(frames.cancel).toHaveBeenCalled();
  });
});
