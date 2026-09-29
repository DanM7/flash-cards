import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import FlashCard from "../../src/components/FlashCard.svelte";

describe("FlashCard", () => {
  it("shows the cue and prompt", () => {
    render(FlashCard, { prompt: "cat", cue: "Say this word" });
    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByText("Say this word")).toBeInTheDocument();
  });

  it("applies compact and fill styles", () => {
    const { container } = render(FlashCard, { prompt: "A long sentence", compact: true, fill: true });
    expect(container.querySelector(".flash")).toHaveClass("flash--fill");
    expect(screen.getByText("A long sentence")).toHaveClass("flash__word--compact");
  });

  it("updates when its props change", async () => {
    const { component } = render(FlashCard, { prompt: "cat" });
    expect(screen.getByText("Say this word")).toBeInTheDocument();
    await component.$set({ prompt: "4 + 4", cue: "Solve this" });
    expect(screen.getByText("4 + 4")).toBeInTheDocument();
    expect(screen.getByText("Solve this")).toBeInTheDocument();
  });
});
