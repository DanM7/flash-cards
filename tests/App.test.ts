import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App.svelte";
import type { SubjectDeck } from "../src/data/CardTypes";
import { getDeckOptionById } from "../src/data/decks";

const params = () => Object.fromEntries(new URLSearchParams(window.location.search));

const renderApp = (search = "") => {
  history.replaceState(null, "", `/${search}`);
  return render(App);
};

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

const startFromTopic = async (title: string, action: string | RegExp) => {
  const article = screen.getByRole("heading", { name: title }).closest("article") as HTMLElement;
  await fireEvent.click(within(article).getByRole("button", { name: action }));
};

const navigate = async (search: string) => {
  history.replaceState(null, "", `/${search}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
  await tick();
};

const shell = () => document.querySelector(".fc-shell") as HTMLElement;

describe("App", () => {
  it("starts on the home screen with a footer linking to the project page", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: "Flash Cards" })).toBeInTheDocument();
    expect(shell()).not.toHaveClass("fc-shell--fit");
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} Dan Maguire`);
    const link = within(footer).getByRole("link", { name: "About this project" });
    expect(link).toHaveAttribute("href", "https://dan-maguire.com/projects/flash-cards");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("opens a typing deck, records it in the URL, and goes back home", async () => {
    renderApp();
    await click(/^Grade 4/);
    await startFromTopic("Sight Words", /Typing/);
    expect(await screen.findByRole("heading", { name: "Sight words" })).toBeInTheDocument();
    expect(screen.getByText("Typing")).toBeInTheDocument();
    expect(shell()).toHaveClass("fc-shell--fit");
    // 4th grade has no subject step, so the subject stays blank.
    expect(params()).toEqual({ grade: "4", subject: "", mode: "typing", unit: "sight-words" });

    await click("← Home");
    expect(screen.getByRole("heading", { name: "4th Grade" })).toBeInTheDocument();
    expect(params()).toEqual({ grade: "4", subject: "", mode: "", unit: "" });
  });

  it("opens a deck with the microphone", async () => {
    renderApp("?grade=4");
    await startFromTopic("Addition Facts", /Microphone/);
    expect(await screen.findByText("Listening")).toBeInTheDocument();
    expect(params()).toMatchObject({ mode: "microphone", unit: "addition-facts" });
  });

  it("opens multiple-choice decks in practice or timed mode", async () => {
    renderApp("?grade=2&subject=math");
    await startFromTopic("Subtraction", /Timed/);
    expect(await screen.findByText("2nd Grade · Subtraction · Timed")).toBeInTheDocument();
    expect(params()).toEqual({ grade: "2", subject: "math", mode: "timed", unit: "subtraction" });

    await click("← Home");
    await startFromTopic("Addition", "Practice");
    expect(await screen.findByText("2nd Grade · Addition · Practice")).toBeInTheDocument();
    expect(params()).toEqual({ grade: "2", subject: "math", mode: "practice", unit: "addition" });
  });

  it("opens a deck straight from a link, without showing home first", async () => {
    renderApp("?grade=2&subject=math&mode=TIMED&unit=Addition");
    expect(screen.queryByRole("heading", { name: "Flash Cards" })).toBeNull();
    expect(await screen.findByText("2nd Grade · Addition · Timed")).toBeInTheDocument();
    expect(params()).toEqual({ grade: "2", subject: "math", mode: "timed", unit: "addition" });
  });

  it("falls back to a sensible mode when the link's mode doesn't fit the deck", async () => {
    renderApp("?grade=4&unit=sight-words&mode=timed");
    expect(await screen.findByText("Typing")).toBeInTheDocument();
    expect(params().mode).toBe("typing");
  });

  it("shows home if a linked deck fails to load", async () => {
    const option = getDeckOptionById("math-grade2-add");
    vi.spyOn(option as { createDeck: () => SubjectDeck }, "createDeck").mockImplementation(() => {
      throw new Error("broken deck");
    });
    renderApp("?grade=2&subject=math&unit=addition");
    expect(await screen.findByRole("heading", { name: "Flash Cards" })).toBeInTheDocument();
  });

  it("follows the browser's back and forward buttons", async () => {
    renderApp();
    await navigate("?grade=2&subject=math&mode=practice&unit=mixed");
    await navigate("?grade=3&subject=math&mode=practice&unit=mixed");
    expect(await screen.findByText("3rd Grade · All Four Operations · Practice")).toBeInTheDocument();
    // Following history never rewrites it.
    expect(window.location.search).toBe("?grade=3&subject=math&mode=practice&unit=mixed");

    await navigate("?grade=3&subject=math");
    expect(screen.getByRole("heading", { name: "3rd Grade · Math" })).toBeInTheDocument();
    await navigate("?grade=3");
    expect(screen.getByText("Pick a subject.")).toBeInTheDocument();
  });

  it("ignores a slow deck once another one has been picked", async () => {
    let finishSlowDeck: (deck: SubjectDeck) => void = () => {};
    const option = getDeckOptionById("math-grade2-add") as { createDeck: () => Promise<SubjectDeck> };
    vi.spyOn(option, "createDeck").mockReturnValue(new Promise((resolve) => (finishSlowDeck = resolve)));

    renderApp("?grade=2&subject=math");
    await startFromTopic("Addition", "Practice");
    await startFromTopic("Subtraction", "Practice");
    expect(await screen.findByText("2nd Grade · Subtraction · Practice")).toBeInTheDocument();

    finishSlowDeck({ subject: "math", operation: "addition", grade: 2, cards: [] });
    await tick();
    await tick();
    expect(params().unit).toBe("subtraction");
    expect(screen.queryByText("You finished the deck!")).toBeNull();
  });

  it("stops listening to history once closed", async () => {
    const { unmount } = renderApp();
    unmount();
    await navigate("?grade=2&subject=math&mode=practice&unit=addition");
    await tick();
    expect(screen.queryByText("2nd Grade · Addition · Practice")).toBeNull();
  });
});

describe("main entry", () => {
  it("mounts the app into #app", async () => {
    const target = document.createElement("div");
    target.id = "app";
    document.body.append(target);
    const { default: app } = await import("../src/main");
    expect(within(target).getByRole("heading", { name: "Flash Cards" })).toBeInTheDocument();
    app.$destroy();
    target.remove();
  });
});
