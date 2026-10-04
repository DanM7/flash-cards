import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { FlashcardData } from "../../src/data/CardTypes";
import HomeRoute from "../../src/routes/index.svelte";
import { copyFlashcardData, flashcardData } from "../helpers/flashcards";

const params = () => Object.fromEntries(new URLSearchParams(window.location.search));

const renderHome = (search = "", data: FlashcardData = flashcardData) => {
  history.replaceState(null, "", `/${search}`);
  const result = render(HomeRoute, { data });
  const onStart = vi.fn();
  result.component.$on("start", onStart);
  return { ...result, onStart, started: () => onStart.mock.calls.map(([event]) => event.detail) };
};

const gradeButton = (grade: number) => {
  const label = flashcardData.catalog.grades.find((entry) => entry.grade === grade)?.label;
  return screen.getByRole("button", { name: new RegExp(`^${label}`) });
};

const topic = (title: string) => {
  const heading = screen.getByRole("heading", { name: title });
  return within(heading.closest("article") as HTMLElement);
};

const goBackInHistory = async (search: string) => {
  history.replaceState(null, "", `/${search}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
  await tick();
};

describe("home route", () => {
  it("lists every grade with its color and subjects, and writes a blank query string", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: "Flash Cards" })).toBeInTheDocument();
    expect(screen.getByText("Practice that fits your grade")).toBeInTheDocument();
    expect(screen.getByText(/^Short practice rounds/)).toBeInTheDocument();
    for (const grade of [2, 3, 4, 5, 6]) {
      expect(gradeButton(grade)).toBeInTheDocument();
    }
    expect(gradeButton(2)).toHaveClass("home-grade--sky");
    expect(gradeButton(6)).toHaveClass("home-grade--amber");
    expect(gradeButton(6)).toHaveTextContent("Geography:");
    expect(within(gradeButton(4)).getByText("Reading:").parentElement).toHaveClass("home-grade__subject--blue");
    // The tile's title already names the grade, so there's no "Grade 2" badge too.
    expect(screen.queryByText(/^Grade \d/)).toBeNull();
    expect(document.querySelector(".home-grade__badge")).toBeNull();
    expect(params()).toEqual({ grade: "", subject: "", mode: "", unit: "" });
  });

  it("takes its tagline and intro from the file", async () => {
    const { component } = renderHome();
    const data = copyFlashcardData();
    data.appSettings.home = { tagline: "New tagline", intro: "New intro" };
    await component.$set({ data });
    expect(screen.getByText("New tagline")).toBeInTheDocument();
    expect(screen.getByText("New intro")).toBeInTheDocument();
  });

  it("shows the file's Timed limit in the hint", async () => {
    const { component } = renderHome("?grade=2&subject=math");
    const hint = screen.getByText(/Multiple choice — Practice at your own pace/);
    const withLimit = (seconds: number) => {
      const data = copyFlashcardData();
      data.appSettings.multipleChoice.secondsPerQuestion = seconds;
      return data;
    };
    await component.$set({ data: withLimit(30) });
    expect(hint).toHaveTextContent("Timed with 30 seconds per question.");
    await component.$set({ data: withLimit(30) });
    expect(hint).toHaveTextContent("Timed with 30 seconds per question.");
  });

  it("picks a subject first in 4th grade, with math, then geography, then reading", async () => {
    renderHome();
    await fireEvent.click(gradeButton(4));
    expect(screen.getByText("Pick a subject.")).toBeInTheDocument();
    const subjects = screen.getAllByRole("button", { name: /^(Math|Geography|Reading)/ });
    expect(subjects.map((button) => button.textContent?.trim().split(/\s/)[0])).toEqual(["Math", "Geography", "Reading"]);

    await fireEvent.click(screen.getByRole("button", { name: /^Math/ }));
    expect(params()).toMatchObject({ grade: "4", subject: "math" });
    expect(screen.getByRole("heading", { name: "4th Grade · Math" })).toBeInTheDocument();
    for (const title of ["Addition", "Subtraction", "Multiplication", "Division", "All Four Operations"]) {
      const buttons = topic(title).getAllByRole("button");
      expect(buttons, title).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent(/^Practice$/);
      expect(buttons[1]).toHaveTextContent(/Timed$/);
    }
  });

  it("goes straight to the decks for grades without a subject step", async () => {
    const data = copyFlashcardData();
    delete data.catalog.grades[2].pickSubject;
    const { started } = renderHome("", data);
    await fireEvent.click(gradeButton(4));
    expect(params().grade).toBe("4");
    expect(screen.getByRole("heading", { name: "4th Grade" })).toBeInTheDocument();
    expect(screen.getByText(/Start with typing or the microphone/)).toBeInTheDocument();

    await fireEvent.click(topic("Speech & Typing").getByRole("button", { name: /Typing/ }));
    await fireEvent.click(topic("Vocabulary").getByRole("button", { name: /Timed/ }));
    await fireEvent.click(topic("Multiplication").getByRole("button", { name: "Practice" }));
    expect(started()).toEqual([
      { deckId: "4-reading-sight-words", useMicrophone: false, interaction: "voice-or-type", timed: false },
      { deckId: "4-reading-vocabulary", useMicrophone: false, interaction: "multiple-choice", timed: true },
      { deckId: "4-math-multiplication", useMicrophone: false, interaction: "multiple-choice", timed: false }
    ]);
    expect(topic("Vocabulary").getByText(/tap that word among look-alikes\. Tap Play again to hear it once more\. \d+ words\./)).toBeInTheDocument();
    // This list mixes subjects, so each deck keeps its subject badge.
    expect(topic("Vocabulary").getByText("Reading")).toHaveClass("home-topic__badge");
    expect(topic("Multiplication").getByText("Math")).toHaveClass("home-topic__badge");
    expect(topic("Multiplication").queryByRole("button", { name: /Microphone|Typing/ })).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "← Grades" }));
    expect(gradeButton(4)).toBeInTheDocument();
    expect(params().grade).toBe("");
  });

  it("picks a subject first for grades that have them, then lists that subject's decks", async () => {
    const { started } = renderHome();
    await fireEvent.click(gradeButton(2));
    expect(screen.getByText("Pick a subject.")).toBeInTheDocument();
    const math = screen.getByRole("button", { name: /Math/ });
    expect(math).toHaveClass("home-grade--red");
    expect(math).toHaveTextContent("Addition and subtraction up to 100.");
    expect(math).not.toHaveTextContent("2nd Grade");

    await fireEvent.click(math);
    expect(params()).toMatchObject({ grade: "2", subject: "math" });
    expect(screen.getByRole("heading", { name: "2nd Grade · Math" })).toBeInTheDocument();
    expect(document.querySelector(".home-topic__badge")).toBeNull();
    expect(screen.getByText(/Multiple choice — Practice at your own pace/)).toHaveTextContent(
      "Timed with 20 seconds per question."
    );

    await fireEvent.click(topic("Addition").getByRole("button", { name: "Practice" }));
    await fireEvent.click(topic("Subtraction").getByRole("button", { name: /Timed/ }));
    expect(started()).toEqual([
      { deckId: "2-math-addition", useMicrophone: false, interaction: "multiple-choice", timed: false },
      { deckId: "2-math-subtraction", useMicrophone: false, interaction: "multiple-choice", timed: true }
    ]);

    await fireEvent.click(screen.getByRole("button", { name: "← 2nd Grade" }));
    expect(screen.getByRole("heading", { name: "2nd Grade" })).toBeInTheDocument();
    expect(params().subject).toBe("");
  });

  it("offers Computer Science, a track named instead of numbered", async () => {
    const { started } = renderHome();
    const track = screen.getByRole("button", { name: /^Computer Science/ });
    expect(track).toHaveClass("home-grade--blue");
    expect(within(track).getByText("Angular:").parentElement).toHaveClass("home-grade__subject--red");
    expect(within(track).getByText("Azure Fundamentals:").parentElement).toHaveClass("home-grade__subject--blue");

    await fireEvent.click(track);
    expect(params().grade).toBe("computer-science");
    await fireEvent.click(screen.getByRole("button", { name: /Angular/ }));
    expect(params()).toMatchObject({ grade: "computer-science", subject: "angular" });
    expect(screen.getByRole("heading", { name: "Computer Science · Angular" })).toBeInTheDocument();
    expect(topic("Beginner").getByText(/24 terms\.$/)).toBeInTheDocument();
    expect(topic("Mastery").getByText(/20 terms\.$/)).toBeInTheDocument();

    await fireEvent.click(topic("Expert").getByRole("button", { name: "Practice" }));
    expect(started()).toEqual([
      { deckId: "computer-science-angular-expert", useMicrophone: false, interaction: "multiple-choice", timed: false }
    ]);
  });

  it("lists units, including ones that are coming soon and the geography final", async () => {
    const { started } = renderHome("?grade=6&subject=math");
    expect(screen.getByRole("heading", { name: "6th Grade · Math" })).toBeInTheDocument();

    const decimals = topic("Unit 1: Decimal Operations");
    expect(decimals.queryByText(/Math · Unit 1|Coming soon/)).toBeNull();
    await fireEvent.click(decimals.getByRole("button", { name: "Practice" }));
    await fireEvent.click(decimals.getByRole("button", { name: /Timed/ }));

    const fractions = topic("Unit 2: Fraction Operations");
    expect(fractions.getByText("Coming soon")).toHaveClass("home-topic__badge");
    expect(fractions.getByText(/will be added once the details are ready/)).toBeInTheDocument();
    const practice = fractions.getByRole("button", { name: "Practice" });
    const timed = fractions.getByRole("button", { name: /Timed/ });
    expect(practice).toBeDisabled();
    // Even if a click slipped through, a unit without a deck starts nothing.
    await fireEvent.click(practice);
    await fireEvent.click(timed);

    expect(started()).toEqual([
      { deckId: "6-math-decimal-operations", useMicrophone: false, interaction: "multiple-choice", timed: false },
      { deckId: "6-math-decimal-operations", useMicrophone: false, interaction: "multiple-choice", timed: true }
    ]);

    await fireEvent.click(screen.getByRole("button", { name: "← 6th Grade" }));
    await fireEvent.click(screen.getByRole("button", { name: /Geography/ }));
    const final = topic("Final: All Countries");
    expect(final.queryByText("Geography · Final")).toBeNull();
    expect(final.getByText("All 194 countries in random order, mixed across every continent.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Final: All Countries" }).closest("article")).toHaveClass(
      "home-topic--orange"
    );
  });

  it("shows subjects that aren't ready yet as coming soon", async () => {
    const data = copyFlashcardData();
    data.catalog.grades[4].subjects[1].available = false;
    renderHome("?grade=6&subject=science", data);
    // An unavailable subject in the URL falls back to the subject list.
    expect(params().subject).toBe("");
    const science = screen.getByRole("button", { name: /Science/ });
    expect(science).toBeDisabled();
    expect(science).toHaveTextContent("Coming soon");
    expect(screen.getByRole("button", { name: /Math/ })).not.toHaveTextContent(/6th Grade|Coming soon/);
  });

  it("shows a subject's grade-tile summary when it has no blurb of its own", async () => {
    const { component } = renderHome("?grade=4");
    expect(screen.getByText("Pick a subject.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reading/ })).toHaveTextContent("More words to find by ear, and words to spell or answer with a mic.");

    const renamed = copyFlashcardData();
    renamed.catalog.subjects.math.label = "Arithmetic";
    await component.$set({ data: renamed });
    expect(screen.getByRole("button", { name: /^Arithmetic/ })).toBeInTheDocument();
  });

  it("ignores an unknown grade in the URL", () => {
    renderHome("?grade=9&subject=math");
    expect(gradeButton(2)).toBeInTheDocument();
    expect(params()).toEqual({ grade: "", subject: "", mode: "", unit: "" });
  });

  it("follows the browser's back and forward buttons", async () => {
    const { unmount } = renderHome();
    await goBackInHistory("?grade=6&subject=french");
    expect(screen.getByRole("heading", { name: "6th Grade · French" })).toBeInTheDocument();
    await goBackInHistory("?grade=4");
    expect(screen.getByRole("heading", { name: "4th Grade" })).toBeInTheDocument();
    await goBackInHistory("?grade=6");
    expect(screen.getByText("Pick a subject.")).toBeInTheDocument();
    // Straight from one grade's subjects to another's, where Math has no blurb of its own.
    await goBackInHistory("?grade=4");
    expect(screen.getByRole("button", { name: /^Math/ })).toHaveTextContent("All four operations with 1- and 2-digit numbers.");
    await goBackInHistory("");
    expect(gradeButton(6)).toBeInTheDocument();

    unmount();
    await goBackInHistory("?grade=4");
    expect(screen.queryByRole("heading", { name: "4th Grade" })).toBeNull();
  });
});
