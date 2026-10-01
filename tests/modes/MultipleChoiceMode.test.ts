import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card, MultipleChoiceSettings, SubjectDeck } from "../../src/data/CardTypes";
import { playTextFor } from "../../src/data/decks";
import MultipleChoiceMode from "../../src/modes/multiple-choice/MultipleChoiceMode.svelte";
import { flashcardData } from "../helpers/flashcards";

const makeCards = (count: number, extra: Partial<Card> = {}): Card[] =>
  Array.from({ length: count }, (_, i) => ({
    prompt: `Q${i}`,
    answers: [`A${i}`],
    choices: [`A${i}`, `B${i}`, `C${i}`, `D${i}`],
    ...extra
  }));

const mathDeck = (count: number, extra: Partial<Card> = {}): SubjectDeck => ({
  subject: "math",
  operation: "addition",
  grade: 2,
  cards: makeCards(count, extra)
});

const renderMode = (deck: SubjectDeck, timed = false, changes: Partial<MultipleChoiceSettings> = {}) => {
  const settings = { ...flashcardData.multipleChoice, ...changes };
  const result = render(MultipleChoiceMode, { deck, timed, settings, text: playTextFor(flashcardData, deck) });
  const onBack = vi.fn();
  result.component.$on("back", onBack);
  return { ...result, onBack };
};

const begin = async () => {
  await fireEvent.pointerDown(document.body);
};

const prompt = () => document.querySelector(".fc-play__question .flash__word")?.textContent ?? "";
const choice = (letter: "A" | "B" | "C" | "D") =>
  screen.getByRole("button", { name: prompt().replace("Q", letter) });
const progress = () => document.querySelector(".fc-progress__text")?.textContent ?? "";
const timerText = () => document.querySelector(".fc-timer__text")?.textContent ?? "";
const pausedCard = () => screen.getByText("PAUSED");

const wait = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await tick();
};

const answerRight = async () => {
  await fireEvent.click(choice("A"));
  await wait(650);
};

describe("MultipleChoiceMode", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"] });
  });

  it("opens on a Ready card and only starts on a tap or Enter/Space outside the buttons", async () => {
    renderMode(mathDeck(2));
    expect(screen.getByText("Ready?")).toBeInTheDocument();
    expect(screen.getByText("Tap anywhere to begin")).toBeInTheDocument();
    expect(screen.queryByText("Choose the answer")).toBeNull();

    const home = screen.getByRole("button", { name: "← Home" });
    await fireEvent.pointerDown(home);
    await fireEvent.keyDown(home, { key: "Enter" });
    await fireEvent.keyDown(document.body, { key: "a" });
    expect(screen.getByText("Ready?")).toBeInTheDocument();

    await fireEvent.keyDown(document.body, { key: " " });
    expect(screen.queryByText("Ready?")).toBeNull();
    expect(screen.getByText("Choose the answer")).toBeInTheDocument();
    expect(screen.getByText("Solve this")).toBeInTheDocument();

    // Once playing, taps and keys no longer do anything special.
    await fireEvent.pointerDown(document.body);
    await fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.getByText("Choose the answer")).toBeInTheDocument();
  });

  it("starts with Enter too", async () => {
    renderMode(mathDeck(1));
    await fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.getByText("Choose the answer")).toBeInTheDocument();
  });

  it("scores first-try answers and finishes the deck", async () => {
    const { onBack } = renderMode(mathDeck(3));
    expect(screen.getByRole("heading", { name: "Math facts" })).toBeInTheDocument();
    expect(screen.getByText("Grade 2 · Practice")).toBeInTheDocument();
    await begin();
    expect(progress()).toBe("Card 1 of 3 · Score: 0 · Percentage: —");
    expect(screen.queryByRole("timer")).toBeNull();

    await fireEvent.click(choice("A"));
    expect(choice("A")).toHaveClass("fc-choice--correct");
    expect(choice("B")).toBeDisabled();
    await wait(650);
    expect(progress()).toBe("Card 2 of 3 · Score: 10 · Percentage: 100%");

    await answerRight();
    await answerRight();
    expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
    expect(screen.getByText("Score: 30")).toBeInTheDocument();
    expect(screen.getByText("Percentage: 100%")).toBeInTheDocument();
    expect(screen.getByText(/Great math practice\./)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    await fireEvent.click(screen.getByRole("button", { name: "← Home" }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it("follows the scoring, round size, and encouragement it's given", async () => {
    renderMode(mathDeck(3, { hint: "Think about it." }), false, {
      roundSize: 2,
      scoring: { firstTry: 5, perWrongPick: 2, hint: 1, minimum: 2 },
      encouragement: ["Keep going!"]
    });
    await begin();
    expect(progress()).toBe("Round 1 of 2 · Card 1 of 2 · Score: 0 · Percentage: —");
    await fireEvent.click(choice("B"));
    await answerRight();
    expect(progress()).toContain("Score: 3");

    await fireEvent.click(screen.getByRole("button", { name: "Hint" }));
    await fireEvent.click(choice("B"));
    await fireEvent.click(choice("C"));
    await answerRight();
    // 5 − 2 × 2 − 1 is 0, so the minimum of 2 applies.
    expect(screen.getByText("Keep going!")).toBeInTheDocument();
    expect(screen.getByText("Round 1 of 2 done · Score: 5 · Percentage: 50%")).toBeInTheDocument();
  });

  it("keeps wrong picks red, and takes points off for misses and hints", async () => {
    renderMode(mathDeck(2, { hint: "Think about it." }));
    await begin();
    const wrongB = choice("B");
    await fireEvent.click(wrongB);
    expect(wrongB).toHaveClass("fc-choice--wrong");
    expect(wrongB).toBeDisabled();
    expect(wrongB).not.toHaveClass("fc-choice--correct");
    await fireEvent.click(choice("C"));
    await fireEvent.click(choice("D"));
    expect(wrongB).toHaveClass("fc-choice--wrong");
    expect(choice("C")).toHaveClass("fc-choice--wrong");
    // A disabled wrong pick can't be scored twice.
    await fireEvent.click(wrongB);

    const hint = screen.getByRole("button", { name: "Hint" });
    expect(screen.getByRole("button", { name: "Skip" })).not.toHaveClass("fc-action-row__span");
    await fireEvent.click(hint);
    expect(hint).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("note")).toHaveTextContent("Think about it.");
    await fireEvent.click(screen.getByRole("button", { name: "Hide hint" }));
    expect(screen.queryByRole("note")).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Hint" }));

    await fireEvent.click(choice("A"));
    // While the right answer is showing, nothing else responds.
    await fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await fireEvent.click(screen.getByRole("button", { name: "Hide hint" }));
    await wait(650);
    expect(progress()).toBe("Card 2 of 2 · Score: 1 · Percentage: 10%");
    expect(screen.queryByRole("note")).toBeNull();

    await fireEvent.click(choice("B"));
    await answerRight();
    expect(screen.getByText("Score: 8")).toBeInTheDocument();
    expect(screen.getByText("Percentage: 40%")).toBeInTheDocument();
  });

  it("counts skipped cards against the percentage", async () => {
    renderMode(mathDeck(2));
    await begin();
    const skip = screen.getByRole("button", { name: "Skip" });
    expect(skip).toHaveClass("fc-action-row__span");
    await fireEvent.click(skip);
    expect(progress()).toBe("Card 2 of 2 · Score: 0 · Percentage: 0%");
    await fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText("Percentage: 0%")).toBeInTheDocument();
  });

  it("breaks the deck into rounds of ten with an encouragement break between them", async () => {
    renderMode(mathDeck(12), true);
    await begin();
    expect(progress()).toBe("Round 1 of 2 · Card 1 of 10 · Score: 0 · Percentage: —");
    for (let i = 0; i < 9; i += 1) {
      await fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    }
    await answerRight();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Round 1 of 2 done · Score: 10 · Percentage: 10%");
    expect(screen.queryByRole("timer")).toBeNull();
    await wait(30_000);
    expect(screen.getByRole("status")).toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", { name: "Next Round →" }));
    expect(progress()).toBe("Round 2 of 2 · Card 1 of 10 · Score: 10 · Percentage: 10%");
    expect(timerText()).toBe("20s");
  });

  describe("timed", () => {
    it("counts down, turns red when time is low, and reveals the answer when time runs out", async () => {
      renderMode(mathDeck(2, { hint: "Carry the one." }), true);
      expect(screen.getByText("Grade 2 · Timed")).toBeInTheDocument();
      expect(timerText()).toBe("20s");
      await wait(5_000);
      // The clock waits for Ready.
      expect(timerText()).toBe("20s");

      await begin();
      await fireEvent.click(screen.getByRole("button", { name: "Hint" }));
      await wait(15_000);
      expect(timerText()).toBe("5s");
      expect(screen.getByRole("timer")).toHaveClass("fc-timer--low");

      await fireEvent.click(choice("B"));
      await wait(5_000);
      expect(timerText()).toBe("0s");
      expect(choice("A")).toHaveClass("fc-choice--correct");
      expect(choice("B")).toHaveClass("fc-choice--wrong");
      expect(choice("C")).toBeDisabled();
      expect(screen.queryByRole("note")).toBeNull();
      expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
      expect(progress()).toContain("Percentage: 0%");

      await fireEvent.click(screen.getByRole("button", { name: "Next →" }));
      expect(progress()).toBe("Card 2 of 2 · Score: 0 · Percentage: 0%");
      expect(timerText()).toBe("20s");
      expect(screen.getByRole("timer")).not.toHaveClass("fc-timer--low");

      await answerRight();
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
      expect(screen.getByText("Percentage: 50%")).toBeInTheDocument();
    });

    it("uses the time limit and low-time warning it's given", async () => {
      renderMode(mathDeck(1), true, { secondsPerQuestion: 8, lowTimeSeconds: 3 });
      expect(timerText()).toBe("8s");
      await begin();
      await wait(4_000);
      expect(timerText()).toBe("4s");
      expect(screen.getByRole("timer")).not.toHaveClass("fc-timer--low");
      await wait(1_000);
      expect(screen.getByRole("timer")).toHaveClass("fc-timer--low");
      await wait(2_000);
      await wait(5_000);
      expect(timerText()).toBe("0s");
      expect(choice("A")).toHaveClass("fc-choice--correct");
    });

    it("pauses the clock and covers the question until resumed", async () => {
      renderMode(mathDeck(2, { hint: "Carry the one." }), true);
      await begin();
      const answer = prompt().replace("Q", "A");
      await fireEvent.click(choice("B"));
      await fireEvent.click(screen.getByRole("button", { name: "Hint" }));
      await wait(4_000);

      expect(pausedCard()).not.toBeVisible();
      await fireEvent.click(screen.getByRole("button", { name: "Pause" }));
      expect(pausedCard()).toBeVisible();
      expect(document.querySelector(".fc-play__question")).toHaveClass("fc-play__question--hidden");
      expect(screen.queryByRole("note")).toBeNull();
      const letters = screen.getAllByRole("button", { name: /^[A-D]$/ });
      expect(letters.map((button) => button.textContent?.trim())).toEqual(["A", "B", "C", "D"]);
      letters.forEach((button) => expect(button).not.toHaveClass("fc-choice--wrong"));

      // Nothing but Resume works while paused.
      await fireEvent.click(letters[0]);
      await fireEvent.click(screen.getByRole("button", { name: "Skip" }));
      await fireEvent.click(screen.getByRole("button", { name: "Hide hint" }));
      await wait(30_000);
      expect(timerText()).toBe("16s");

      await fireEvent.click(screen.getByRole("button", { name: "Resume" }));
      expect(pausedCard()).not.toBeVisible();
      expect(screen.getByRole("note")).toBeInTheDocument();
      await wait(1_000);
      expect(timerText()).toBe("15s");

      await fireEvent.click(screen.getByRole("button", { name: answer }));
      // Locked on the right answer: Pause does nothing.
      await fireEvent.click(screen.getByRole("button", { name: "Pause" }));
      expect(pausedCard()).not.toBeVisible();
      await wait(650);

      await fireEvent.click(screen.getByRole("button", { name: "Skip" }));
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
    });

    it("stops the clock when the screen closes", async () => {
      const clear = vi.spyOn(window, "clearInterval");
      const { unmount } = renderMode(mathDeck(2), true);
      await begin();
      clear.mockClear();
      unmount();
      expect(clear).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a map for geography cards, and the map-sized PAUSED card", async () => {
    const deck: SubjectDeck = {
      subject: "geography",
      grade: 6,
      unitLabel: "Unit 3: South America",
      cards: [
        { prompt: "Name this country", answers: ["France"], choices: ["France", "Spain"], map: { countryId: "250" } },
        { prompt: "Which country is this?", answers: ["Spain"], choices: ["France", "Spain"], map: { countryId: "724" } }
      ]
    };
    const mapCue = () => document.querySelector(".map-card__label")?.textContent;
    renderMode(deck, true);
    expect(screen.getByRole("heading", { name: "Geography" })).toBeInTheDocument();
    expect(screen.getByText("Unit 3: South America · Timed")).toBeInTheDocument();
    await begin();
    const firstCue = mapCue();
    expect(["Name this country", "Which country is this?"]).toContain(firstCue);

    await fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(pausedCard()).not.toHaveClass("flash__word--compact");
    expect(pausedCard().closest(".flash")).toHaveClass("flash--fill");
    await fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    const firstMap = document.querySelector(".map-card");
    await fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    // The next country reuses the same map rather than rebuilding it.
    expect(document.querySelector(".map-card")).toBe(firstMap);
    expect(mapCue()).not.toBe(firstCue);
  });

  it("uses compact text for word questions", async () => {
    const deck: SubjectDeck = {
      subject: "science",
      grade: 6,
      unitLabel: "Unit 1: Cells",
      cards: makeCards(1)
    };
    renderMode(deck, true);
    await begin();
    expect(screen.getByText("Answer this")).toBeInTheDocument();
    expect(screen.getByText("Q0")).toHaveClass("flash__word--compact");
    await fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(pausedCard()).toHaveClass("flash__word--compact");
  });

  it("falls back to the answer alone when a card has too few choices", async () => {
    renderMode({
      subject: "math",
      operation: "addition",
      cards: [
        { prompt: "1 + 1", answers: ["2", "two"], choices: ["2"], hint: "Count up from one." },
        { prompt: "2 + 2", answers: ["4"] }
      ]
    });
    await begin();
    expect(screen.getAllByRole("button", { name: /^\d$/ })).toHaveLength(1);
    await fireEvent.click(screen.getByRole("button", { name: /^\d$/ }));
    await wait(650);
    expect(screen.getAllByRole("button", { name: /^\d$/ })).toHaveLength(1);
  });

  it.each([
    [{ subject: "math", operation: "decimal-operations", unitLabel: "Unit 1: Decimal Operations", cards: [] }, "Decimal Operations", "Unit 1: Decimal Operations · Practice", "Solid decimal practice."],
    [{ subject: "math", operation: "addition", cards: [] }, "Math facts", "Multiple choice · Practice", "Great math practice."],
    [{ subject: "science", grade: 6, unitLabel: "Unit 2: Human Body", cards: [] }, "Science", "Unit 2: Human Body · Practice", "Nice studying."],
    [{ subject: "french", grade: 6, unitLabel: "", cards: [] }, "French", "Multiple choice · Practice", "Nice studying."],
    [{ subject: "sight-words", grade: 4, cards: [] }, "Sight words", "Multiple choice · Practice", "Nice studying."],
    [{ subject: "custom", cards: [] }, "Practice", "Multiple choice · Practice", "Nice studying."]
  ] as [SubjectDeck, string, string, string][])("titles a %s deck and finishes an empty one", (deck, title, subtitle, closing) => {
    renderMode(deck);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
    expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
    expect(screen.getByText("Percentage: —")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(closing))).toBeInTheDocument();
  });
});
