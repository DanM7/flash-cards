<script lang="ts">
  import type { DeckResult, ScoreHistory } from "../progress/ProgressModel";
  import { ProgressStore } from "../progress/ProgressStore";

  let dialog: HTMLDialogElement;
  let history: ScoreHistory = { recent: [], best: [] };

  const byDeck = (a: DeckResult, b: DeckResult) =>
    `${a.context} ${a.title} ${a.mode}`.localeCompare(`${b.context} ${b.title} ${b.mode}`, undefined, { numeric: true });
  const sections = [
    { id: "profile-recent", heading: "Recent scores", resultsIn: (scores: ScoreHistory) => scores.recent },
    {
      id: "profile-best",
      heading: "All-time high scores",
      resultsIn: (scores: ScoreHistory) => [...scores.best].sort(byDeck)
    }
  ];

  const percentOf = (result: DeckResult) => Math.round((result.score / result.possible) * 100);
  const dateOf = (result: DeckResult) =>
    new Date(result.finishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const modeNames: Record<DeckResult["mode"], string> = {
    practice: "Practice",
    timed: "Timed",
    typing: "Typing",
    microphone: "Microphone"
  };
  const isUnfinished = (result: DeckResult) => result.cardsPlayed < result.cardsTotal;

  /**
   * Opens over the page with the latest scores. The browser handles the rest of a modal: Escape
   * closes it, focus stays inside, and focus goes back to the profile icon afterward.
   */
  export const show = () => {
    history = ProgressStore.history();
    dialog.showModal();
  };

  const close = () => dialog.close();

  /** The panel fills the dialog, so a click landing on the dialog itself is on the backdrop. */
  const closeFromBackdrop = (event: MouseEvent) => {
    if (event.target === dialog) {
      close();
    }
  };
</script>

<!-- Keyboard users close it with Escape (built in) or the Close button. -->
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog class="profile" aria-labelledby="profile-title" bind:this={dialog} on:click={closeFromBackdrop}>
  <div class="profile__panel">
    <header class="profile__head">
      <h2 id="profile-title" class="profile__title">Your scores</h2>
      <button type="button" class="profile__close" aria-label="Close" on:click={close}>×</button>
    </header>

    <div class="profile__body">
      {#each sections as section (section.id)}
        {@const results = section.resultsIn(history)}
        <section class="profile__section" aria-labelledby={section.id}>
          <h3 id={section.id} class="profile__heading">{section.heading}</h3>
          {#if results.length > 0}
            <ul class="profile__list">
              {#each results as result (result)}
                <li class="profile-row">
                  <div class="profile-row__deck">
                    <span class="profile-row__title">{result.title}</span>
                    <span class="profile-row__meta">{result.context} · {modeNames[result.mode]} · {dateOf(result)}</span>
                    {#if isUnfinished(result)}
                      <span class="profile-row__unfinished">
                        Unfinished: stopped after {result.cardsPlayed} of {result.cardsTotal} cards
                      </span>
                    {/if}
                  </div>
                  <span class="profile-row__score">{result.score} <small>({percentOf(result)}%)</small></span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="profile__empty">No scores yet. Play a deck to see it here.</p>
          {/if}
        </section>
      {/each}
    </div>
  </div>
</dialog>

<style>
  .profile {
    width: min(100vw - 1.5rem, 44rem);
    height: min(100vh - 1.5rem, 48rem);
    height: min(100dvh - 1.5rem, 48rem);
    max-width: none;
    max-height: none;
    padding: 0;
    border: 1px solid var(--fc-border);
    border-radius: var(--fc-radius-lg);
    background: var(--fc-surface-elevated);
    box-shadow: var(--fc-shadow-lg);
    overflow: hidden;
  }

  .profile::backdrop {
    background: rgba(15, 23, 42, 0.45);
  }

  .profile__panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .profile__head {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fc-space-md);
    padding: var(--fc-space-md) var(--fc-space-lg);
    border-bottom: 1px solid var(--fc-border);
  }

  .profile__title {
    margin: 0;
    font-size: clamp(1.2rem, 4vw, 1.45rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fc-text);
  }

  .profile__close {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    font-size: 1.75rem;
    line-height: 1;
    color: var(--fc-text-muted);
    cursor: pointer;
  }

  .profile__close:hover {
    background: rgba(15, 23, 42, 0.05);
    color: var(--fc-text);
  }

  .profile__close:focus-visible {
    outline: 3px solid var(--fc-primary-soft);
  }

  .profile__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--fc-space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-xl);
  }

  .profile__heading {
    margin: 0 0 var(--fc-space-sm);
    font-size: 0.8125rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--fc-text-muted);
  }

  .profile__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .profile-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fc-space-md);
    padding: var(--fc-space-sm) 0;
    border-bottom: 1px solid var(--fc-border);
  }

  .profile-row:last-child {
    border-bottom: none;
  }

  .profile-row__deck {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .profile-row__title {
    font-weight: 700;
    color: var(--fc-text);
  }

  .profile-row__meta {
    font-size: 0.8125rem;
    color: var(--fc-text-muted);
  }

  .profile-row__unfinished {
    font-size: 0.75rem;
    font-weight: 700;
    color: #b45309;
  }

  .profile-row__score {
    flex: none;
    font-size: 1.125rem;
    font-weight: 800;
    color: var(--fc-primary-hover);
  }

  .profile-row__score small {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--fc-text-muted);
  }

  .profile__empty {
    margin: 0;
    font-size: 0.875rem;
    color: var(--fc-text-muted);
  }
</style>
