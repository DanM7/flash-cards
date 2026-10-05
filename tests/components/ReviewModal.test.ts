import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it } from "vitest";
import ReviewModal from "../../src/components/ReviewModal.svelte";

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;
const definitionList = () => document.querySelector(".review__definitions") as HTMLElement;
const wordList = () => document.querySelector(".review__words") as HTMLElement;
const definitionRows = () =>
  Array.from(document.querySelectorAll(".review__row")).map((row) => [
    row.querySelector("dt")?.textContent,
    row.querySelector("dd")?.textContent
  ]);
const words = () => within(wordList()).queryAllByRole("listitem").map((item) => item.textContent);

describe("ReviewModal", () => {
  it("stays closed until shown", () => {
    render(ReviewModal);
    expect(dialog()).not.toHaveAttribute("open");
  });

  it("lists a deck's terms and definitions alphabetically, with the close button first", async () => {
    const { component } = render(ReviewModal);
    component.show("Angular · Beginner", {
      kind: "definitions",
      definitions: [
        { term: "Pipe", definition: "Transforms a value in a template." },
        { term: "Component", definition: "A class, template, and styles that control a view." }
      ]
    });
    await tick();
    expect(dialog()).toHaveAttribute("open");
    expect(screen.getByRole("dialog", { name: "Angular · Beginner" })).toBe(dialog());
    expect(screen.getByText("2 terms")).toBeInTheDocument();
    expect(definitionRows()).toEqual([
      ["Component", "A class, template, and styles that control a view."],
      ["Pipe", "Transforms a value in a template."]
    ]);
    expect(wordList()).not.toBeVisible();
    expect(within(dialog()).getAllByRole("button")[0]).toHaveAccessibleName("Close");
  });

  it("lists just the words for a vocabulary deck, alphabetically and ignoring capitals", async () => {
    const { component } = render(ReviewModal);
    const listed = ["the", "of", "I", "and", "is"];
    component.show("Reading · Vocabulary", { kind: "words", words: listed });
    await tick();
    expect(screen.getByRole("heading", { name: "Reading · Vocabulary" })).toBeInTheDocument();
    expect(screen.getByText("5 words")).toBeInTheDocument();
    expect(words()).toEqual(["and", "I", "is", "of", "the"]);
    expect(listed).toEqual(["the", "of", "I", "and", "is"]);
    expect(definitionList()).not.toBeVisible();
  });

  it("lists states with their capitals, by state", async () => {
    const { component } = render(ReviewModal);
    component.show("Geography · State Capitals", {
      kind: "capitals",
      definitions: [
        { term: "Texas", definition: "Austin" },
        { term: "Alaska", definition: "Juneau" }
      ]
    });
    await tick();
    expect(screen.getByText("2 states")).toBeInTheDocument();
    expect(definitionRows()).toEqual([
      ["Alaska", "Juneau"],
      ["Texas", "Austin"]
    ]);
    expect(wordList()).not.toBeVisible();
  });

  it("closes from its button or a click on the backdrop, and shows the new deck when opened again", async () => {
    const { component } = render(ReviewModal);
    component.show("Angular · Beginner", { kind: "definitions", definitions: [{ term: "Pipe", definition: "Transforms a value in a template." }] });
    await tick();
    expect(screen.getByText("1 term")).toBeInTheDocument();
    await fireEvent.click(screen.getByText("Pipe"));
    expect(dialog()).toHaveAttribute("open");
    await fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog()).not.toHaveAttribute("open");

    component.show("Reading · Vocabulary", { kind: "words", words: ["go"] });
    await tick();
    expect(screen.getByText("1 word")).toBeInTheDocument();
    expect(definitionRows()).toEqual([]);
    component.show("Reading · Vocabulary", { kind: "words", words: ["up", "down"] });
    await tick();
    expect(words()).toEqual(["down", "up"]);
    await fireEvent.click(dialog());
    expect(dialog()).not.toHaveAttribute("open");
  });
});
