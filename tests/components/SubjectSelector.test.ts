import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SubjectSelector from "../../src/components/SubjectSelector.svelte";
import { getDecksForGrade } from "../../src/data/decks";
import SelectSubject from "../../src/routes/select-subject.svelte";
import { flashcardData } from "../helpers/flashcards";

const options = getDecksForGrade(flashcardData, 4);
const optionFor = (id: string) => options.find((option) => option.id === id);

describe("SubjectSelector", () => {
  it("lists deck options and reports the one picked", async () => {
    const { component } = render(SubjectSelector, { options });
    const onSelect = vi.fn();
    component.$on("select", onSelect);
    await fireEvent.click(screen.getByRole("button", { name: "Multiplication" }));
    expect(onSelect.mock.calls[0][0].detail).toBe(optionFor("4-math-multiplication"));
  });

  it("renders an empty list by default", () => {
    render(SubjectSelector);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("select-subject route", () => {
  it("passes selections through and offers a back button", async () => {
    const { component } = render(SelectSubject, { options });
    const onSelect = vi.fn();
    const onBack = vi.fn();
    component.$on("select", onSelect);
    component.$on("back", onBack);
    await fireEvent.click(screen.getByRole("button", { name: "Speech & Typing" }));
    await fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onSelect.mock.calls[0][0].detail).toBe(optionFor("4-reading-sight-words"));
    expect(onBack).toHaveBeenCalled();
  });

  it("renders with no options", () => {
    render(SelectSubject);
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });
});
