import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ListenCard from "../../src/components/ListenCard.svelte";
import { installSynthesis } from "../helpers/speech";

const voice = { lang: "en-US", rate: 0.85 };

describe("ListenCard", () => {
  it("reads the word without showing it, and again on Play again", async () => {
    const synth = installSynthesis();
    render(ListenCard, { text: "vast", cue: "Listen to the word", voice });
    expect(screen.getByText("Listen to the word")).toBeInTheDocument();
    expect(screen.queryByText("vast")).toBeNull();
    expect(synth.words).toEqual(["vast"]);
    await fireEvent.click(screen.getByRole("button", { name: /Play again/ }));
    expect(synth.words).toEqual(["vast", "vast"]);
  });

  it("reads a new word when it changes, and stops when removed", async () => {
    const synth = installSynthesis();
    const { component, unmount } = render(ListenCard, { text: "vast", cue: "Listen", voice });
    await component.$set({ text: "weary", cue: "Listen again" });
    expect(synth.words).toEqual(["vast", "weary"]);
    expect(screen.getByText("Listen again")).toBeInTheDocument();
    const cancelled = synth.cancelled;
    unmount();
    expect(synth.cancelled).toBe(cancelled + 1);
  });
});
