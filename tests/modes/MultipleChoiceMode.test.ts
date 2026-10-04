import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card, MultipleChoiceSettings, SubjectDeck } from "../../src/data/CardTypes";
import { playTextFor } from "../../src/data/decks";
import MultipleChoiceMode from "../../src/modes/multiple-choice/MultipleChoiceMode.svelte";
import { flashcardData } from "../helpers/flashcards";
import { installSynthesis } from "../helpers/speech";

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
  const settings = { ...flashcardData.appSettings.multipleChoice, ...changes };
  const result = render(MultipleChoiceMode, {
    deck,
    timed,
    settings,
    text: playTextFor(flashcardData, deck),
    language: flashcardData.appSettings.language
  });
  const onBack = vi.fn();
  const onHome = vi.fn();
  result.component.$on("back", onBack);
  result.component.$on("home", onHome);
  return { ...result, onBack, onHome };
};

const readyCard = () => screen.getByRole("button", { name: /Tap here to begin/ });

const begin = async () => {
  await fireEvent.click(readyCard());
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

  it("opens on a Ready card and only starts when that card is tapped", async () => {
    renderMode(mathDeck(2));
    expect(screen.getByText("Ready?")).toBeInTheDocument();
    expect(screen.getByText("Tap here to begin")).toBeInTheDocument();
    expect(screen.queryByText("Choose the answer")).toBeNull();

    // Taps and keys anywhere else leave it waiting.
    await fireEvent.pointerDown(document.body);
    await fireEvent.click(document.body);
    await fireEvent.click(screen.getByRole("heading", { name: "Math facts" }));
    await fireEvent.keyDown(document.body, { key: "Enter" });
    await fireEvent.keyDown(document.body, { key: " " });
    expect(screen.getByText("Ready?")).toBeInTheDocument();
    expect(screen.queryByText("Choose the answer")).toBeNull();

    await begin();
    expect(screen.queryByText("Ready?")).toBeNull();
    expect(screen.getByText("Choose the answer")).toBeInTheDocument();
    expect(screen.getByText("Solve this")).toBeInTheDocument();
  });

  it("focuses the Ready card so Enter or Space can start the game", () => {
    renderMode(mathDeck(1));
    expect(document.activeElement).toBe(readyCard());
  });

  it("scores first-try answers and finishes the deck", async () => {
    const { onBack, onHome } = renderMode(mathDeck(3));
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
    await fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(onBack).toHaveBeenCalledTimes(2);
    expect(onHome).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(onHome).toHaveBeenCalledOnce();
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

  describe("listening decks", () => {
    const vocabularyDeck = (count: number): SubjectDeck => ({
      subject: "vocabulary",
      grade: 4,
      listen: true,
      cards: makeCards(count)
    });
    const waves = () => document.querySelector(".listen__waves");

    it("reads each word aloud instead of showing it, and replays it on request", async () => {
      const synth = installSynthesis();
      renderMode(vocabularyDeck(2), false, { speech: { rate: 0.7 } });
      expect(synth.spoken).toHaveLength(0);

      await begin();
      expect(screen.getByText("Listen to the word")).toBeInTheDocument();
      expect(screen.queryByText(/^Q\d$/)).toBeNull();
      const first = synth.latest.text;
      expect(synth.latest).toMatchObject({ lang: "en-US", rate: 0.7 });

      expect(waves()).not.toHaveClass("listen__waves--speaking");
      synth.latest.onstart?.();
      await tick();
      expect(waves()).toHaveClass("listen__waves--speaking");
      synth.latest.onend?.();
      await tick();
      expect(waves()).not.toHaveClass("listen__waves--speaking");

      await fireEvent.click(screen.getByRole("button", { name: /Play again/ }));
      expect(synth.words).toEqual([first, first]);

      await fireEvent.click(screen.getByRole("button", { name: first.replace("Q", "A") }));
      await wait(650);
      const second = synth.latest.text;
      expect(synth.words).toEqual([first, first, second]);
      expect(second).not.toBe(first);

      const cancelled = synth.cancelled;
      await fireEvent.click(screen.getByRole("button", { name: second.replace("Q", "A") }));
      await wait(650);
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
      expect(synth.cancelled).toBe(cancelled + 1);
    });

    it("reads a card in its own language, under the general listening cue", async () => {
      const synth = installSynthesis();
      renderMode({
        subject: "french",
        grade: 6,
        unitLabel: "Unit 1: Alphabet",
        listen: true,
        cards: [{ prompt: "e accent aigu", answers: ["é"], choices: ["é", "è", "ê", "e"], lang: "fr-FR" }]
      });
      await begin();
      expect(screen.getByText("Listen, then pick what you hear")).toBeInTheDocument();
      expect(synth.latest).toMatchObject({ text: "e accent aigu", lang: "fr-FR" });
      await fireEvent.click(screen.getByRole("button", { name: "è" }));
      expect(screen.getByRole("button", { name: "è" })).toHaveClass("fc-choice--wrong");
      await fireEvent.click(screen.getByRole("button", { name: "é" }));
      expect(screen.getByRole("button", { name: "é" })).toHaveClass("fc-choice--correct");
    });

    it("stops reading when paused", async () => {
      const synth = installSynthesis();
      renderMode(vocabularyDeck(1), true);
      await begin();
      const cancelled = synth.cancelled;
      await fireEvent.click(screen.getByRole("button", { name: "Pause" }));
      expect(synth.cancelled).toBe(cancelled + 1);
    });

    it("shows the word when the browser can't read aloud", async () => {
      renderMode(vocabularyDeck(1));
      await begin();
      expect(prompt()).toBe("Q0");
      expect(screen.queryByRole("button", { name: /Play again/ })).toBeNull();
    });
  });

  it.each([
    [{ subject: "math", operation: "decimal-operations", unitLabel: "Unit 1: Decimal Operations", cards: [] }, "Decimal Operations", "Unit 1: Decimal Operations · Practice", "Solid decimal practice."],
    [{ subject: "math", operation: "addition", cards: [] }, "Math facts", "Multiple choice · Practice", "Great math practice."],
    [{ subject: "science", grade: 6, unitLabel: "Unit 2: Human Body", cards: [] }, "Science", "Unit 2: Human Body · Practice", "Nice studying."],
    [{ subject: "french", grade: 6, unitLabel: "", cards: [] }, "French", "Multiple choice · Practice", "Nice studying."],
    [{ subject: "sight-words", grade: 4, cards: [] }, "Speech & Typing", "Multiple choice · Practice", "Nice studying."],
    [{ subject: "vocabulary", grade: 4, listen: true, cards: [] }, "Vocabulary", "Multiple choice · Practice", "Great listening."],
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
