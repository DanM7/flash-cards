import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it } from "vitest";
import ProfileModal from "../../src/components/ProfileModal.svelte";
import type { DeckResult } from "../../src/progress/ProgressModel";
import { ProgressStore } from "../../src/progress/ProgressStore";

const result = (changes: Partial<DeckResult>): DeckResult => ({
  deckId: "2-math-addition",
  title: "Addition",
  context: "2nd Grade · Math",
  mode: "practice",
  score: 80,
  possible: 100,
  cardsPlayed: 10,
  cardsTotal: 10,
  finishedAt: "2026-10-05T12:00:00.000Z",
  ...changes
});

const showModal = () => {
  const view = render(ProfileModal);
  view.component.show();
  return view;
};

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;
const section = (name: string) => within(screen.getByRole("region", { name }));
const rows = (name: string) =>
  section(name)
    .getAllByRole("listitem")
    .map((row) => row.textContent?.replace(/\s+/g, " ").trim());

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

describe("ProfileModal", () => {
  it("stays closed until shown", () => {
    render(ProfileModal);
    expect(dialog()).not.toHaveAttribute("open");
  });

  it("says there are no scores yet", async () => {
    showModal();
    await tick();
    expect(dialog()).toHaveAttribute("open");
    expect(screen.getByRole("dialog", { name: "Your scores" })).toBe(dialog());
    expect(section("Recent scores").getByText(/No scores yet/)).toBeInTheDocument();
    expect(section("All-time high scores").getByText(/No scores yet/)).toBeInTheDocument();
  });

  it("lists recent scores newest first, and high scores by grade and deck", async () => {
    ProgressStore.record(result({ deckId: "6-french-letters", title: "Unit 1: Alphabet", context: "6th Grade · French", score: 230, possible: 260 }));
    ProgressStore.record(result({ mode: "timed", score: 50, finishedAt: "2026-10-06T12:00:00.000Z" }));
    ProgressStore.record(result({ deckId: "2-math-subtraction", title: "Subtraction", score: 100 }));
    showModal();
    await tick();

    const day1 = dateOf("2026-10-05T12:00:00.000Z");
    const day2 = dateOf("2026-10-06T12:00:00.000Z");
    expect(rows("Recent scores")).toEqual([
      `Subtraction 2nd Grade · Math · Practice · ${day1} 100 (100%)`,
      `Addition 2nd Grade · Math · Timed · ${day2} 50 (50%)`,
      `Unit 1: Alphabet 6th Grade · French · Practice · ${day1} 230 (88%)`
    ]);
    expect(rows("All-time high scores")).toEqual([
      `Addition 2nd Grade · Math · Timed · ${day2} 50 (50%)`,
      `Subtraction 2nd Grade · Math · Practice · ${day1} 100 (100%)`,
      `Unit 1: Alphabet 6th Grade · French · Practice · ${day1} 230 (88%)`
    ]);
  });

  it("marks unfinished decks, and names the typing and microphone modes", async () => {
    ProgressStore.record(result({ title: "50 States", mode: "typing", score: 40, possible: 50, cardsPlayed: 5, cardsTotal: 50 }));
    ProgressStore.record(result({ title: "Words", mode: "microphone", score: 90 }));
    showModal();
    await tick();

    const day = dateOf("2026-10-05T12:00:00.000Z");
    expect(rows("Recent scores")).toEqual([
      `Words 2nd Grade · Math · Microphone · ${day} 90 (90%)`,
      `50 States 2nd Grade · Math · Typing · ${day} Unfinished: stopped after 5 of 50 cards 40 (80%)`
    ]);
    expect(rows("All-time high scores")).toEqual([`Words 2nd Grade · Math · Microphone · ${day} 90 (90%)`]);
  });

  it("closes from its button or a click on the backdrop, and shows fresh scores when opened again", async () => {
    const { component } = showModal();
    await fireEvent.click(screen.getByRole("heading", { name: "Your scores" }));
    expect(dialog()).toHaveAttribute("open");

    await fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog()).not.toHaveAttribute("open");

    ProgressStore.record(result({}));
    component.show();
    await tick();
    expect(rows("Recent scores")).toHaveLength(1);
    await fireEvent.click(dialog());
    expect(dialog()).not.toHaveAttribute("open");
  });
});
