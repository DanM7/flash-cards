<script lang="ts">
  import HomeRoute from "./routes/index.svelte";
  import PlayRoute from "./routes/play.svelte";
  import MultipleChoiceMode from "./modes/multiple-choice/MultipleChoiceMode.svelte";
  import { onDestroy, onMount } from "svelte";
  import {
    findDeckByUnit,
    getDeckOptionById,
    resolveDeck,
    subjectAreasByGrade,
    type DeckOption
  } from "./data/decks";
  import type { InteractionMode, SubjectDeck } from "./data/CardTypes";
  import { readNav, writeNav, type PlayMode } from "./nav";

  /** "loading" covers opening a deck straight from the URL, so home doesn't flash first. */
  type View = "home" | "loading" | "play";

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
    const option = findDeckByUnit(nav.grade, nav.subject, nav.unit);
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
    const deck = await resolveDeck(option);
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
      const hasSubjectStep = subjectAreasByGrade[option.grade]?.some((area) => area.id === option.subject);
      writeNav(
        { grade: String(option.grade), subject: hasSubjectStep ? option.subject : "", mode, unit: option.unit },
        how
      );
    }
  };

  const initialRequest = requestFromUrl();
  let view: View = initialRequest ? "loading" : "home";
  if (initialRequest) {
    launch(initialRequest, "replace").catch(() => {
      view = "home";
    });
  }

  const start = (
    event: CustomEvent<{
      deckId: string;
      useMicrophone: boolean;
      interaction: InteractionMode;
      timed: boolean;
    }>
  ) => {
    const option = getDeckOptionById(event.detail.deckId);
    if (!option) {
      return;
    }
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
    {#if view === "home"}
      <HomeRoute on:start={start} />
    {:else if view === "play" && selectedDeck}
      {#key playSession}
        {#if interaction === "multiple-choice"}
          <MultipleChoiceMode deck={selectedDeck} {timed} on:back={backToHome} />
        {:else}
          <PlayRoute deck={selectedDeck} autoMic={useMicrophone} on:back={backToHome} />
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
