import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import DeckSummary from "../../src/components/DeckSummary.svelte";

const text = "Change detection, lifecycle hooks, forms, HTTP, and component communication. 28 terms.";

/** jsdom has no layout, so the text's height is set by hand: taller than its box means it overflows two lines. */
const textHeight = (scrollHeight: number, clientHeight = 44) => {
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockReturnValue(scrollHeight);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(clientHeight);
};

const renderSummary = (reviewLabel = "") => {
  const view = render(DeckSummary, { text, reviewLabel });
  const onReview = vi.fn();
  view.component.$on("review", onReview);
  return { ...view, onReview };
};

const paragraph = () => screen.getByText(text);
const links = () => screen.queryAllByRole("button").map((button) => button.textContent?.trim());

describe("DeckSummary", () => {
  it("shows text that fits in two lines with no links", () => {
    textHeight(44);
    renderSummary();
    expect(paragraph()).toHaveClass("deck-summary__text--clamped");
    expect(links()).toEqual([]);
    expect(document.querySelector(".deck-summary__links")).not.toBeVisible();
  });

  it("cuts longer text to two lines, with More… to show the rest and Less to cut it again", async () => {
    textHeight(66);
    renderSummary();
    const more = screen.getByRole("button", { name: "More…" });
    expect(more).toHaveAttribute("aria-expanded", "false");

    await fireEvent.click(more);
    expect(paragraph()).not.toHaveClass("deck-summary__text--clamped");
    expect(more).toHaveTextContent("Less");
    expect(more).toHaveAttribute("aria-expanded", "true");

    await fireEvent.click(more);
    expect(paragraph()).toHaveClass("deck-summary__text--clamped");
    expect(more).toHaveTextContent("More…");
  });

  it("checks again when the window is resized", async () => {
    textHeight(44);
    const { unmount } = renderSummary();
    expect(links()).toEqual([]);

    textHeight(66);
    window.dispatchEvent(new Event("resize"));
    await tick();
    expect(links()).toEqual(["More…"]);

    textHeight(44);
    window.dispatchEvent(new Event("resize"));
    await tick();
    expect(links()).toEqual([]);

    unmount();
    expect(() => window.dispatchEvent(new Event("resize"))).not.toThrow();
  });

  it("shows the review link it's given, and reports clicks on it", async () => {
    textHeight(44);
    const { onReview } = renderSummary("View definitions");
    expect(links()).toEqual(["View definitions"]);
    await fireEvent.click(screen.getByRole("button", { name: "View definitions" }));
    expect(onReview).toHaveBeenCalledOnce();
  });

  it("follows new text and review link, measuring the new text", async () => {
    textHeight(44);
    const { component } = renderSummary();
    textHeight(66);
    await component.$set({ text: "A longer description.", reviewLabel: "View words" });
    expect(screen.getByText("A longer description.")).toBeInTheDocument();
    expect(links()).toEqual(["More…", "View words"]);
  });

  it("lists More… before the review link when it needs both", () => {
    textHeight(66);
    renderSummary("View definitions");
    expect(links()).toEqual(["More…", "View definitions"]);
  });
});
