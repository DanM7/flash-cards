import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.svelte";
import type { MathDeck } from "../src/data/CardTypes";
import { createWholeNumberDeck } from "../src/data/subjects/math/wholeNumberOperations";
import { stubFlashcardsFetch } from "./helpers/flashcards";

vi.mock("../src/data/subjects/math/wholeNumberOperations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/data/subjects/math/wholeNumberOperations")>();
  return { ...actual, createWholeNumberDeck: vi.fn(actual.createWholeNumberDeck) };
});

const params = () => Object.fromEntries(new URLSearchParams(window.location.search));

const loaded = () => vi.waitFor(() => expect(screen.queryByText("Loading flashcards…")).toBeNull());

const renderApp = async (search = "") => {
  history.replaceState(null, "", `/${search}`);
  const result = render(App);
  await loaded();
  return result;
};

/** A flashcards request that stays open until `finish` is called. */
const holdFlashcardsFetch = () => {
  let finish = () => {};
  const fetchMock = stubFlashcardsFetch();
  const answer = fetchMock.getMockImplementation() as () => Promise<unknown>;
  fetchMock.mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve(answer()))));
  return () => finish();
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
  beforeEach(() => {
    stubFlashcardsFetch();
  });

  it("starts on the home screen with a footer linking to the project page", async () => {
    await renderApp();
    expect(fetch).toHaveBeenCalledWith("/src/data/flashcards.json");
    expect(screen.getByRole("heading", { name: "Flash Cards" })).toBeInTheDocument();
    expect(shell()).not.toHaveClass("fc-shell--fit");
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} Dan Maguire`);
    const link = within(footer).getByRole("link", { name: "About this project" });
    expect(link).toHaveAttribute("href", "https://dan-maguire.com/projects/flash-cards");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("opens a typing deck, records it in the URL, and goes back home", async () => {
    await renderApp();
    await click(/^Grade 4/);
    await startFromTopic("Speech & Typing", /Typing/);
    expect(await screen.findByRole("heading", { name: "Speech & Typing" })).toBeInTheDocument();
    expect(screen.getByText("Typing")).toBeInTheDocument();
    expect(shell()).toHaveClass("fc-shell--fit");
    // 4th grade has no subject step, so the subject stays blank.
    expect(params()).toEqual({ grade: "4", subject: "", mode: "typing", unit: "sight-words" });

    await click("← Home");
    expect(screen.getByRole("heading", { name: "4th Grade" })).toBeInTheDocument();
    expect(params()).toEqual({ grade: "4", subject: "", mode: "", unit: "" });
  });

  it("opens a deck with the microphone", async () => {
    await renderApp("?grade=4");
    await startFromTopic("Addition Facts", /Microphone/);
    expect(await screen.findByText("Listening")).toBeInTheDocument();
    expect(params()).toMatchObject({ mode: "microphone", unit: "addition-facts" });
  });

  it("opens multiple-choice decks in practice or timed mode", async () => {
    await renderApp("?grade=2&subject=math");
    await startFromTopic("Subtraction", /Timed/);
    expect(await screen.findByText("2nd Grade · Subtraction · Timed")).toBeInTheDocument();
    expect(params()).toEqual({ grade: "2", subject: "math", mode: "timed", unit: "subtraction" });

    await click("← Home");
    await startFromTopic("Addition", "Practice");
    expect(await screen.findByText("2nd Grade · Addition · Practice")).toBeInTheDocument();
    expect(params()).toEqual({ grade: "2", subject: "math", mode: "practice", unit: "addition" });
  });

  it("opens a deck straight from a link, without showing home first", async () => {
    await renderApp("?grade=2&subject=math&mode=TIMED&unit=Addition");
    expect(screen.queryByRole("heading", { name: "Flash Cards" })).toBeNull();
    expect(await screen.findByText("2nd Grade · Addition · Timed")).toBeInTheDocument();
    expect(params()).toEqual({ grade: "2", subject: "math", mode: "timed", unit: "addition" });
  });

  it("falls back to a sensible mode when the link's mode doesn't fit the deck", async () => {
    await renderApp("?grade=4&unit=sight-words&mode=timed");
    expect(await screen.findByText("Typing")).toBeInTheDocument();
    expect(params().mode).toBe("typing");
  });

  it("shows home if a linked deck fails to load", async () => {
    vi.mocked(createWholeNumberDeck).mockImplementationOnce(() => {
      throw new Error("broken deck");
    });
    await renderApp("?grade=2&subject=math&unit=addition");
    expect(await screen.findByRole("heading", { name: "Flash Cards" })).toBeInTheDocument();
  });

  it("follows the browser's back and forward buttons", async () => {
    await renderApp();
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
    let finishSlowDeck: (deck: MathDeck) => void = () => {};
    // The deck builder only ever returns a deck, but App has to cope with ones that load slowly.
    vi.mocked(createWholeNumberDeck).mockReturnValueOnce(
      new Promise((resolve) => (finishSlowDeck = resolve)) as unknown as MathDeck
    );

    await renderApp("?grade=2&subject=math");
    await startFromTopic("Addition", "Practice");
    await startFromTopic("Subtraction", "Practice");
    expect(await screen.findByText("2nd Grade · Subtraction · Practice")).toBeInTheDocument();

    finishSlowDeck({ subject: "math", operation: "addition", grade: 2, cards: [{ prompt: "1 + 1", answers: ["2"] }] });
    await tick();
    await tick();
    expect(params().unit).toBe("subtraction");
    expect(screen.queryByText("You finished the deck!")).toBeNull();
  });

  it("shows a loading message until the flashcards arrive", async () => {
    const finish = holdFlashcardsFetch();
    history.replaceState(null, "", "/");
    render(App);
    expect(screen.getByRole("status")).toHaveTextContent("Loading flashcards…");
    expect(screen.queryByRole("heading", { name: "Flash Cards" })).toBeNull();
    finish();
    expect(await screen.findByRole("heading", { name: "Flash Cards" })).toBeInTheDocument();
  });

  it("waits for the flashcards before following the browser's back and forward buttons", async () => {
    const finish = holdFlashcardsFetch();
    history.replaceState(null, "", "/");
    render(App);
    await navigate("?grade=2&subject=math&mode=practice&unit=addition");
    expect(screen.getByRole("status")).toBeInTheDocument();
    finish();
    expect(await screen.findByText("2nd Grade · Addition · Practice")).toBeInTheDocument();
  });

  it("offers to try again when the flashcards can't load", async () => {
    stubFlashcardsFetch({}, 503);
    await renderApp("?grade=4");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load the flashcards. Check your connection and try again.");
    expect(screen.queryByRole("heading", { name: "Flash Cards" })).toBeNull();

    stubFlashcardsFetch();
    await fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "4th Grade" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("stops listening to history once closed", async () => {
    const { unmount } = await renderApp();
    unmount();
    await navigate("?grade=2&subject=math&mode=practice&unit=addition");
    await tick();
    expect(screen.queryByText("2nd Grade · Addition · Practice")).toBeNull();
  });
});

describe("main entry", () => {
  it("mounts the app into #app", async () => {
    stubFlashcardsFetch();
    const target = document.createElement("div");
    target.id = "app";
    document.body.append(target);
    const { default: app } = await import("../src/main");
    expect(await within(target).findByRole("heading", { name: "Flash Cards" })).toBeInTheDocument();
    app.$destroy();
    target.remove();
  });
});
