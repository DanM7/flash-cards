<script lang="ts">
  import HomeRoute from "./routes/index.svelte";
  import PlayRoute from "./routes/play.svelte";
  import MultipleChoiceMode from "./modes/multiple-choice/MultipleChoiceMode.svelte";
  import { getDeckOptionById, resolveDeck } from "./data/decks";
  import type { InteractionMode, SubjectDeck } from "./data/CardTypes";

  type View = "home" | "play";

  let view: View = "home";
  let selectedDeck: SubjectDeck | null = null;
  let useMicrophone = false;
  let interaction: InteractionMode = "voice-or-type";
  let timed = false;
  let startRequest = 0;

  const start = async (
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
    const request = ++startRequest;
    const deck = await resolveDeck(option);
    if (request !== startRequest) {
      return;
    }
    useMicrophone = event.detail.useMicrophone;
    interaction = event.detail.interaction;
    timed = event.detail.timed;
    selectedDeck = deck;
    view = "play";
  };

  const backToHome = () => {
    useMicrophone = false;
    interaction = "voice-or-type";
    timed = false;
    selectedDeck = null;
    view = "home";
  };
</script>

<div class="fc-shell">
  <main class="fc-shell__main">
    {#if view === "home"}
      <HomeRoute on:start={start} />
    {:else if view === "play" && selectedDeck}
      {#if interaction === "multiple-choice"}
        <MultipleChoiceMode deck={selectedDeck} {timed} on:back={backToHome} />
      {:else}
        <PlayRoute deck={selectedDeck} autoMic={useMicrophone} on:back={backToHome} />
      {/if}
    {/if}
  </main>
</div>

<style>
  .fc-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: clamp(var(--fc-space-md), 4vw, var(--fc-space-xl));
    padding-bottom: calc(var(--fc-space-xl) + env(safe-area-inset-bottom, 0px));
  }

  .fc-shell__main {
    width: 100%;
    max-width: 42rem;
    margin: 0 auto;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
