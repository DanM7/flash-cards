<script lang="ts">
  import HomeRoute from "./routes/index.svelte";
  import PlayRoute from "./routes/play.svelte";
  import MultipleChoiceMode from "./modes/multiple-choice/MultipleChoiceMode.svelte";
  import { onDestroy, onMount } from "svelte";
  import {
    findDeckByUnit,
    getDeckOptionById,
    playTextFor,
    resolveDeck,
    subjectStepFor,
    type DeckOption
  } from "./data/decks";
  import type { FlashcardData, InteractionMode, SubjectDeck } from "./data/CardTypes";
  import { readNav, writeNav, type PlayMode } from "./nav";
  import { loadFlashcards } from "./services/flashcardService";

  /** "loading" covers opening a deck straight from the URL, so home doesn't flash first. */
  type View = "home" | "loading" | "play";

  /** Every screen needs the flashcards, so nothing else shows until they arrive. */
  let data: FlashcardData | null = null;
  let loadFailed = false;

  interface PlayRequest {
    option: DeckOption;
    mode: PlayMode;
  }

  let selectedDeck: SubjectDeck | null = null;
  let useMicrophone = false;
  let interaction: InteractionMode = "voice-or-type";
  let timed = false;
  let startRequest = 0;
  /** Bumped on every start so a new deck always gets a fresh play screen. */
  let playSession = 0;

  const modeFor = (option: DeckOption, mode: string): PlayMode =>
    option.interaction === "multiple-choice"
      ? mode === "timed"
        ? "timed"
        : "practice"
      : mode === "microphone"
        ? "microphone"
        : "typing";

  const requestFromUrl = (): PlayRequest | null => {
    const nav = readNav();
    const option = findDeckByUnit(data as FlashcardData, nav.grade, nav.subject, nav.unit);
    return option ? { option, mode: modeFor(option, nav.mode) } : null;
  };

  const resetPlay = () => {
    startRequest += 1;
    useMicrophone = false;
    interaction = "voice-or-type";
    timed = false;
    selectedDeck = null;
  };

  const launch = async ({ option, mode }: PlayRequest, how: "push" | "replace" | null) => {
    const request = ++startRequest;
    const deck = await resolveDeck(option, data as FlashcardData);
    if (request !== startRequest) {
      return;
    }
    interaction = option.interaction;
    timed = mode === "timed";
    useMicrophone = mode === "microphone";
    selectedDeck = deck;
    playSession += 1;
    view = "play";
    if (how) {
      const hasSubjectStep = subjectStepFor(data as FlashcardData, option.grade)?.some(
        (entry) => entry.subject === option.subject
      );
      writeNav(
        { grade: String(option.grade), subject: hasSubjectStep ? option.subject : "", mode, unit: option.unit },
        how
      );
    }
  };

  let view: View = "loading";

  const loadData = async () => {
    loadFailed = false;
    try {
      data = await loadFlashcards();
    } catch {
      loadFailed = true;
      return;
    }
    const initialRequest = requestFromUrl();
    if (initialRequest) {
      launch(initialRequest, "replace").catch(() => {
        view = "home";
      });
    } else {
      view = "home";
    }
  };

  void loadData();

  const start = (
    event: CustomEvent<{
      deckId: string;
      useMicrophone: boolean;
      interaction: InteractionMode;
      timed: boolean;
    }>
  ) => {
    // Home only offers decks from the catalog.
    const option = getDeckOptionById(data as FlashcardData, event.detail.deckId) as DeckOption;
    const mode = modeFor(option, event.detail.timed ? "timed" : event.detail.useMicrophone ? "microphone" : "");
    void launch({ option, mode }, "push");
  };

  const backToHome = () => {
    resetPlay();
    view = "home";
    writeNav({ mode: "", unit: "" }, "push");
  };

  /** Browser back/forward: open whatever deck the URL names, or return home. */
  const syncFromUrl = () => {
    if (!data) {
      return;
    }
    const request = requestFromUrl();
    if (request) {
      void launch(request, null);
    } else if (view !== "home") {
      resetPlay();
      view = "home";
    }
  };

  onMount(() => {
    window.addEventListener("popstate", syncFromUrl);
  });

  onDestroy(() => {
    window.removeEventListener("popstate", syncFromUrl);
  });
</script>

<div class="fc-shell" class:fc-shell--fit={view === "play"}>
  <main class="fc-shell__main">
    {#if loadFailed}
      <div class="fc-surface fc-status" role="alert">
        <p>Couldn't load the flashcards. Check your connection and try again.</p>
        <button type="button" class="fc-btn fc-btn--primary" on:click={loadData}>Try again</button>
      </div>
    {:else if !data}
      <p class="fc-surface fc-status" role="status">Loading flashcards…</p>
    {:else if view === "home"}
      <HomeRoute {data} on:start={start} />
    {:else if view === "play" && selectedDeck}
      {#key playSession}
        {#if interaction === "multiple-choice"}
          <MultipleChoiceMode
            deck={selectedDeck}
            {timed}
            settings={data.multipleChoice}
            text={playTextFor(data, selectedDeck)}
            on:back={backToHome}
          />
        {:else}
          <PlayRoute
            deck={selectedDeck}
            autoMic={useMicrophone}
            settings={data.typingAndVoice}
            text={playTextFor(data, selectedDeck)}
            on:back={backToHome}
          />
        {/if}
      {/key}
    {/if}
  </main>
  <footer class="fc-footer">
    © {new Date().getFullYear()} Dan Maguire ·
    <a href="https://dan-maguire.com/projects/flash-cards" target="_blank" rel="noopener">About this project</a>
  </footer>
</div>

<style>
  .fc-shell {
    --fc-shell-pad-y: clamp(0.75rem, 2.5vh, var(--fc-space-xl));
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: var(--fc-shell-pad-y) clamp(var(--fc-space-md), 4vw, var(--fc-space-xl));
    padding-bottom: calc(var(--fc-shell-pad-y) + env(safe-area-inset-bottom, 0px));
  }

  /* Play screens are exactly one screen tall; the card area shrinks instead of the page scrolling. */
  .fc-shell--fit {
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
  }

  .fc-shell__main {
    width: 100%;
    max-width: 42rem;
    margin: 0 auto;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .fc-status {
    margin: auto 0;
    padding: var(--fc-space-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--fc-space-md);
    text-align: center;
    font-weight: 600;
    color: var(--fc-text-muted);
  }

  .fc-status p {
    margin: 0;
  }

  .fc-footer {
    flex: none;
    margin-top: clamp(0.5rem, 1.5vh, var(--fc-space-md));
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--fc-text-soft);
  }

  .fc-footer a {
    color: var(--fc-text-muted);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .fc-footer a:hover {
    color: var(--fc-primary);
  }
</style>
