<script lang="ts">
  import HomeRoute from "./routes/index.svelte";
  import PlayRoute from "./routes/play.svelte";
  import { getDeckById } from "./data/decks";
  import type { SubjectDeck } from "./data/CardTypes";

  type View = "home" | "play";

  let view: View = "home";
  let selectedDeck: SubjectDeck | null = null;
  let useMicrophone = false;

  const start = (event: CustomEvent<{ deckId: string; useMicrophone: boolean }>) => {
    useMicrophone = event.detail.useMicrophone;
    selectedDeck = getDeckById(event.detail.deckId);
    view = "play";
  };

  const backToHome = () => {
    useMicrophone = false;
    selectedDeck = null;
    view = "home";
  };
</script>

<div class="fc-shell">
  <main class="fc-shell__main">
    {#if view === "home"}
      <HomeRoute on:start={start} />
    {:else if view === "play" && selectedDeck}
      <PlayRoute deck={selectedDeck} autoMic={useMicrophone} on:back={backToHome} />
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
