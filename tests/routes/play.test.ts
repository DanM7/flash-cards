import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubjectDeck } from "../../src/data/CardTypes";
import { SpeechRecognizer } from "../../src/nlp/SpeechRecognizer";
import PlayRoute from "../../src/routes/play.svelte";
import { FakeRecognition, installSpeech, uninstallSpeech } from "../helpers/speech";

const words = (...list: string[]): SubjectDeck => ({
  subject: "sight-words",
  grade: 4,
  cards: list.map((word) => ({ prompt: word, answers: [word] }))
});

const renderPlay = (deck: SubjectDeck, autoMic = false) => {
  const result = render(PlayRoute, { deck, autoMic });
  const onBack = vi.fn();
  result.component.$on("back", onBack);
  return { ...result, onBack };
};

const prompt = () => document.querySelector(".flash__word")?.textContent ?? "";
const answerBox = () => screen.getByLabelText("Your answer") as HTMLInputElement;
const type = (value: string) => fireEvent.input(answerBox(), { target: { value } });
const progress = () => document.querySelector(".fc-progress__text")?.textContent ?? "";
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const feedback = () => document.querySelector(".fc-feedback") as HTMLElement;
const historyRows = () =>
  Array.from(document.querySelectorAll(".fc-history__row")).map((row) =>
    Array.from(row.children).map((cell) => cell.textContent)
  );

const wait = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await tick();
};

const heard = async (recognizer: FakeRecognition, ...transcripts: string[]) => {
  recognizer.emitResult([{ transcripts, isFinal: true }]);
  await tick();
};

describe("play route (typing and voice)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  });

  afterEach(() => {
    uninstallSpeech();
  });

  describe("typing", () => {
    it("names the deck, and warns when the browser can't listen", () => {
      renderPlay(words("cat"));
      expect(screen.getByRole("heading", { name: "Sight words" })).toBeInTheDocument();
      expect(screen.getByText("Grade 4")).toBeInTheDocument();
      expect(screen.getByText("Typing")).toBeInTheDocument();
      expect(screen.getByText("Say this word")).toBeInTheDocument();
      expect(screen.getByText(/Speech recognition isn’t available/)).toBeInTheDocument();
      expect(button("Use microphone")).toBeDisabled();
      expect(screen.getByText("No attempts yet")).toBeInTheDocument();
    });

    it("checks typed answers and moves on when one is right", async () => {
      renderPlay(words("cat", "dog", "sun"));
      expect(progress()).toBe("Card 1 of 3");
      const first = prompt();

      await type("zebra");
      expect(feedback()).toBeVisible();
      expect(feedback()).toHaveClass("fc-feedback--bad");
      expect(feedback()).toHaveTextContent(`Not quite. Accepted: ${first}`);
      expect(document.querySelector(".fc-mini__body")).toHaveTextContent("zebra");

      await type("  ");
      expect(feedback()).not.toBeVisible();

      await type(first);
      expect(progress()).toBe("Card 2 of 3");
      expect(answerBox().value).toBe("");
      expect(historyRows()).toEqual([[first, first, "correct"]]);
      expect(document.querySelector(".fc-mini__body")).toHaveTextContent("—");
    });

    it("can mark a card correct or skip it", async () => {
      const { onBack } = renderPlay(words("cat", "dog", "sun", "hat"));
      const first = prompt();
      await fireEvent.click(button("Mark correct"));
      const second = prompt();
      await type("close enough?");
      await fireEvent.click(button("Mark correct"));
      const third = prompt();
      await fireEvent.click(button("Skip"));

      expect(historyRows()).toEqual([
        [third, "(empty)", "incorrect"],
        [second, "close enough?", "correct"],
        [first, "(marked)", "correct"]
      ]);
      await fireEvent.click(button("Skip"));
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
      await fireEvent.click(button("Back to home"));
      await fireEvent.click(button("← Home"));
      expect(onBack).toHaveBeenCalledTimes(2);
    });

    it("asks again when an answer sounds like another word", async () => {
      renderPlay(words("an"));
      expect(screen.getAllByRole("button", { name: "Mark correct" })).toHaveLength(1);
      await type("and");
      expect(feedback()).toHaveClass("fc-feedback--maybe");
      expect(feedback()).toHaveTextContent("Almost. We heard “and”. Try again, or mark correct if that was right.");

      await fireEvent.click(button("Try again"));
      expect(feedback()).not.toBeVisible();
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();

      await type("and");
      const [, ambiguousMarkCorrect] = screen.getAllByRole("button", { name: "Mark correct" });
      await fireEvent.click(ambiguousMarkCorrect);
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
    });

    it("takes a short break after every five cards, but not after the last one", async () => {
      renderPlay(words("a1", "a2", "a3", "a4", "a5", "a6"));
      for (let i = 0; i < 5; i += 1) {
        await type(prompt());
      }
      expect(screen.getByRole("status")).toHaveTextContent("Quick breather");
      expect(answerBox()).toBeDisabled();
      expect(button("Skip")).toBeDisabled();
      expect(screen.queryByText("Listening details")).toBeNull();
      expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();

      await wait(2_800);
      expect(screen.queryByRole("status")).toBeNull();
      expect(document.querySelector(".flash")).toBeInTheDocument();
      await wait(1_100);
      await type(prompt());
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("pauses and resumes", async () => {
      renderPlay(words("cat"));
      expect(screen.queryByRole("dialog")).toBeNull();
      await fireEvent.click(button("Pause"));
      expect(screen.getByRole("dialog")).toHaveTextContent("Ready when you are.");
      expect(screen.getByText("Paused", { selector: ".fc-pill" })).toBeInTheDocument();
      expect(answerBox()).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
      // Typing is ignored while paused.
      await type("cat");
      expect(progress()).toBe("Card 1 of 1");

      await fireEvent.click(button("Go!"));
      expect(screen.queryByRole("dialog")).toBeNull();
      await type("cat");
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
    });

    it.each([
      [{ subject: "math", operation: "decimal-operations", unitLabel: "Unit 1: Decimal Operations", cards: [] }, "Decimal Operations", "Unit 1: Decimal Operations"],
      [{ subject: "math", operation: "addition", cards: [] }, "Math facts", "Addition"],
      [{ subject: "vocabulary", topic: "Animals", cards: [] }, "Vocabulary", "Animals"],
      [{ subject: "custom", cards: [] }, "Practice", ""]
    ] as [SubjectDeck, string, string][])("titles a %s deck", (deck, title, subtitle) => {
      renderPlay(deck);
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(document.querySelector(".fc-play__subtitle")?.textContent).toBe(subtitle);
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
    });

    it("asks math questions as problems to solve", () => {
      renderPlay({ subject: "math", operation: "addition", cards: [{ prompt: "2 + 2", answers: ["4"] }] });
      expect(screen.getByText("Solve this")).toBeInTheDocument();
    });
  });

  describe("microphone button", () => {
    beforeEach(() => {
      installSpeech();
    });

    const listen = async () => {
      await fireEvent.click(button("Use microphone"));
      return FakeRecognition.latest;
    };

    it("listens once, shows what it hears, and scores the answer", async () => {
      renderPlay(words("cat", "dog"));
      const first = prompt();
      expect(screen.queryByText(/isn’t available/)).toBeNull();
      const recognizer = await listen();
      expect(button("Listening…")).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
      expect(screen.getByText("Mic warming up...")).toBeInTheDocument();
      expect(screen.getByText("Live: (waiting for speech…)")).toBeInTheDocument();

      recognizer.emitStart();
      await tick();
      expect(screen.getByText("Mic ready")).toBeInTheDocument();
      recognizer.emitResult([{ transcripts: ["zzz", first] }]);
      await tick();
      expect(screen.getByText(`Live: zzz`)).toBeInTheDocument();
      expect(screen.getByText(`Candidates: zzz, ${first}`)).toBeInTheDocument();

      recognizer.emitEnd();
      await vi.waitFor(() => expect(progress()).toBe("Card 2 of 2"));
      expect(historyRows()).toEqual([[first, `zzz, ${first}`, "correct"]]);
      expect(button("Use microphone")).toBeEnabled();
    });

    it("records a wrong answer and shows what was heard last", async () => {
      renderPlay(words("cat"));
      const recognizer = await listen();
      recognizer.emitResult([{ transcripts: ["dog"] }]);
      recognizer.emitEnd();
      await vi.waitFor(() => expect(feedback()).toHaveClass("fc-feedback--bad"));
      expect(screen.getByText("Last heard: dog")).toBeInTheDocument();
      expect(historyRows()).toEqual([["cat", "dog", "incorrect"]]);
    });

    it("keeps the first guess when none of the heard words are right", async () => {
      renderPlay(words("an"));
      const recognizer = await listen();
      recognizer.emitResult([{ transcripts: ["and", "dog"] }]);
      recognizer.emitEnd();
      await vi.waitFor(() => expect(feedback()).toHaveClass("fc-feedback--maybe"));
      expect(historyRows()).toEqual([["an", "and, dog", "ambiguous"]]);

      await fireEvent.click(button("Try again"));
      const again = await listen();
      again.emitResult([{ transcripts: ["dog", "and"] }]);
      again.emitEnd();
      await vi.waitFor(() => expect(feedback()).toHaveClass("fc-feedback--bad"));
    });

    it("notes when nothing was heard", async () => {
      renderPlay(words("cat"));
      const recognizer = await listen();
      recognizer.emitResult([{ transcripts: [""] }]);
      recognizer.emitEnd();
      await vi.waitFor(() => expect(historyRows()).toEqual([["cat", "(empty)", "empty"]]));
      expect(feedback()).not.toBeVisible();
    });

    it("shows microphone errors", async () => {
      renderPlay(words("cat"));
      const recognizer = await listen();
      recognizer.emitError("not-allowed");
      await vi.waitFor(() => expect(screen.getByText("Microphone permission denied.")).toBeVisible());
      expect(button("Use microphone")).toBeEnabled();
    });

    it("has a fallback message for unexpected failures", async () => {
      vi.spyOn(SpeechRecognizer, "listenOnce").mockRejectedValue("boom");
      renderPlay(words("cat"));
      await listen();
      await vi.waitFor(() => expect(screen.getByText("Speech input failed.")).toBeVisible());
    });

    it("ignores the result if the deck finished while listening", async () => {
      renderPlay(words("cat"));
      const recognizer = await listen();
      await fireEvent.click(button("Skip"));
      recognizer.emitResult([{ transcripts: ["cat"] }]);
      recognizer.emitEnd();
      await vi.waitFor(() => expect(screen.getByText("You finished the deck!")).toBeInTheDocument());
      expect(historyRows()).toEqual([]);
    });
  });

  describe("continuous microphone", () => {
    beforeEach(() => {
      installSpeech();
    });

    const readyMic = async () => {
      const recognizer = FakeRecognition.latest;
      recognizer.emitStart();
      await tick();
      return recognizer;
    };

    it("waits for the mic before showing the word, then scores each phrase", async () => {
      renderPlay(words("cat", "dog"), true);
      expect(screen.getByText("Listening")).toBeInTheDocument();
      expect(screen.getByText("Getting microphone ready")).toBeInTheDocument();
      expect(screen.getByText(/The word will pop up/)).toBeInTheDocument();
      expect(screen.getByText(/Continuous listening/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Use microphone" })).toBeNull();
      expect(FakeRecognition.latest.started).toBe(1);

      const recognizer = await readyMic();
      const first = prompt();
      expect(screen.getByText("Mic ready")).toBeInTheDocument();

      recognizer.emitResult([{ transcripts: ["ca"] }]);
      await tick();
      expect(screen.getByText("Live: ca")).toBeInTheDocument();
      recognizer.emitResult([{ transcripts: [""] }]);
      await tick();
      expect(screen.getByText("Live: (waiting for speech…)")).toBeInTheDocument();

      await heard(recognizer, "zzz");
      expect(feedback()).toHaveClass("fc-feedback--bad");
      await heard(recognizer, first);
      expect(progress()).toBe("Card 2 of 2");
      expect(historyRows()).toEqual([
        [first, first, "correct"],
        [first, "zzz", "incorrect"]
      ]);
    });

    it("shows errors until speech comes through again, and keeps listening across reconnects", async () => {
      renderPlay(words("cat"), true);
      const recognizer = await readyMic();
      const banner = document.querySelector(".fc-banner--error");
      expect(banner).not.toBeVisible();
      recognizer.emitError("network");
      await tick();
      expect(banner).toBeVisible();
      expect(banner).toHaveTextContent(/lost connection/);
      expect(screen.getByText("Getting microphone ready")).toBeInTheDocument();

      recognizer.emitResult([{ transcripts: ["c"] }]);
      await tick();
      expect(banner).not.toBeVisible();

      recognizer.emitEnd();
      await wait(0);
      expect(recognizer.started).toBe(2);
    });

    it("keeps listening through the break and holds off scoring until the word is back", async () => {
      renderPlay(words("a1", "a2", "a3", "a4", "a5", "a6", "a7"), true);
      const recognizer = await readyMic();
      for (let i = 0; i < 5; i += 1) {
        await heard(recognizer, prompt());
      }
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.queryByText(/Continuous listening/)).toBeNull();
      await heard(recognizer, "a6");

      await wait(2_800);
      expect(historyRows()).toHaveLength(5);
      expect(screen.getByText(/Starting microphone… wait until the word appears/)).toBeInTheDocument();
      expect(screen.getByText("Getting microphone ready")).toBeInTheDocument();
      await heard(recognizer, "a6");
      expect(historyRows()).toHaveLength(5);

      await wait(1_100);
      expect(screen.queryByText(/Starting microphone/)).toBeNull();
      const next = prompt();
      // Still inside the short scoring hold-off after the break.
      await heard(recognizer, next);
      expect(historyRows()).toHaveLength(5);
      await wait(600);
      await heard(recognizer, next);
      expect(historyRows()).toHaveLength(6);
    });

    it("hides the word briefly if the mic restarts after a break", async () => {
      renderPlay(words("a1", "a2", "a3", "a4", "a5", "a6"), true);
      const recognizer = await readyMic();
      for (let i = 0; i < 5; i += 1) {
        await heard(recognizer, prompt());
      }
      await wait(2_800);
      const transcript = document.querySelector(".fc-mini__body");
      recognizer.emitResult([{ transcripts: ["noise"] }]);
      await tick();
      expect(transcript).toHaveTextContent("noise");

      recognizer.emitStart();
      await tick();
      expect(transcript).toHaveTextContent("—");
      expect(screen.getByText("Getting microphone ready")).toBeInTheDocument();
      await wait(550);
      expect(screen.queryByText("Getting microphone ready")).toBeNull();
      expect(document.querySelector(".flash")).toBeInTheDocument();
    });

    it("stops listening while an unclear answer is sorted out", async () => {
      renderPlay(words("an", "an"), true);
      const recognizer = await readyMic();
      await heard(recognizer, "and");
      expect(feedback()).toHaveClass("fc-feedback--maybe");
      expect(recognizer.stopped).toBe(1);
      expect(document.querySelector(".flash")).toBeInTheDocument();
      await heard(recognizer, "an");
      expect(historyRows()).toHaveLength(1);

      await fireEvent.click(button("Try again"));
      const restarted = FakeRecognition.latest;
      expect(restarted).not.toBe(recognizer);
      await heard(restarted, "an");
      expect(progress()).toBe("Card 2 of 2");
    });

    it("stops listening while paused and starts again on Go", async () => {
      renderPlay(words("cat"), true);
      const recognizer = await readyMic();
      await fireEvent.click(button("Pause"));
      expect(recognizer.stopped).toBe(1);
      expect(screen.getByText("Paused", { selector: ".fc-pill" })).toBeInTheDocument();
      expect(screen.queryByText(/Continuous listening/)).toBeNull();
      await heard(recognizer, "cat");
      expect(historyRows()).toHaveLength(0);

      await fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Go!" }));
      expect(FakeRecognition.latest).not.toBe(recognizer);
    });

    it("stops listening when the deck is done", async () => {
      renderPlay({ subject: "math", operation: "addition", cards: [{ prompt: "2 + 2", answers: ["4"] }] }, true);
      expect(screen.getByText(/The problem will pop up/)).toBeInTheDocument();
      const recognizer = await readyMic();
      await heard(recognizer, "4");
      expect(screen.getByText("You finished the deck!")).toBeInTheDocument();
      expect(recognizer.stopped).toBe(1);
      await heard(recognizer, "4");
    });

    it("waits forever for a mic the browser doesn't have", () => {
      uninstallSpeech();
      renderPlay(words("cat"), true);
      expect(screen.getByText("Getting microphone ready")).toBeInTheDocument();
      expect(screen.getByText(/Speech recognition isn’t available/)).toBeInTheDocument();
    });
  });
});
