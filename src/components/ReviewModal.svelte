<script lang="ts">
  import type { DeckReview, Definition } from "../data/decks";

  let dialog: HTMLDialogElement;
  let title = "";
  let kind: DeckReview["kind"] = "definitions";
  let definitions: Definition[] = [];
  let words: string[] = [];

  const nouns: Record<DeckReview["kind"], string> = { definitions: "term", capitals: "state", words: "word" };
  const counted = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
  const alphabetical = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

  $: count = counted(words.length + definitions.length, nouns[kind]);

  /** Opens over the page; like the scores window, Escape closes it and focus returns to the link afterward. */
  export const show = (deckTitle: string, review: DeckReview) => {
    title = deckTitle;
    kind = review.kind;
    definitions =
      review.kind === "words" ? [] : [...review.definitions].sort((a, b) => alphabetical(a.term, b.term));
    words = review.kind === "words" ? [...review.words].sort(alphabetical) : [];
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
<dialog class="review" aria-labelledby="review-title" bind:this={dialog} on:click={closeFromBackdrop}>
  <div class="review__panel">
    <header class="review__head">
      <button type="button" class="review__close" aria-label="Close" on:click={close}>×</button>
      <div>
        <h2 id="review-title" class="review__title">{title}</h2>
        <p class="review__count">{count}</p>
      </div>
    </header>

    <div class="review__body">
      <dl class="review__definitions" hidden={definitions.length === 0}>
        {#each definitions as entry (entry)}
          <div class="review__row">
            <dt class="review__term">{entry.term}</dt>
            <dd class="review__meaning">{entry.definition}</dd>
          </div>
        {/each}
      </dl>
      <ul class="review__words" hidden={words.length === 0}>
        {#each words as word}
          <li class="review__word">{word}</li>
        {/each}
      </ul>
    </div>
  </div>
</dialog>

<style>
  .review {
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

  .review::backdrop {
    background: rgba(15, 23, 42, 0.45);
  }

  .review__panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .review__head {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--fc-space-sm);
    padding: var(--fc-space-md) var(--fc-space-lg) var(--fc-space-md) var(--fc-space-sm);
    border-bottom: 1px solid var(--fc-border);
  }

  .review__title {
    margin: 0;
    font-size: clamp(1.2rem, 4vw, 1.45rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fc-text);
  }

  .review__count {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--fc-text-muted);
  }

  .review__close {
    flex: none;
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

  .review__close:hover {
    background: rgba(15, 23, 42, 0.05);
    color: var(--fc-text);
  }

  .review__close:focus-visible {
    outline: 3px solid var(--fc-primary-soft);
  }

  .review__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: var(--fc-space-sm) var(--fc-space-lg) var(--fc-space-lg);
  }

  .review__definitions {
    margin: 0;
  }

  .review__row {
    padding: var(--fc-space-sm) 0;
    border-bottom: 1px solid var(--fc-border);
  }

  .review__row:last-child {
    border-bottom: none;
  }

  .review__term {
    font-weight: 800;
    color: var(--fc-text);
  }

  .review__meaning {
    margin: 0.125rem 0 0;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--fc-text-muted);
  }

  .review__words {
    margin: 0;
    padding: var(--fc-space-sm) 0 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: var(--fc-space-xs) var(--fc-space-md);
  }

  .review__definitions[hidden],
  .review__words[hidden] {
    display: none;
  }

  .review__word {
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--fc-border);
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--fc-text);
  }
</style>
