<script lang="ts">
  import { afterUpdate, createEventDispatcher, onDestroy, onMount } from "svelte";

  export let text: string;
  /** A link like "View words" to look over the deck before playing; none when blank. */
  export let reviewLabel = "";

  const dispatch = createEventDispatcher<{ review: void }>();

  let paragraph: HTMLParagraphElement;
  let expanded = false;
  let overflowing = false;

  $: toggleLabel = expanded ? "Less" : "More…";

  /** Expanded text never overflows, so "More…" only depends on how the clamped text fits. */
  const measure = () => {
    if (!expanded) {
      overflowing = paragraph.scrollHeight > paragraph.clientHeight + 1;
    }
  };

  const toggle = () => {
    expanded = !expanded;
  };

  /** Covers the first render, new text, and cutting the text back to two lines. */
  afterUpdate(measure);

  onMount(() => {
    window.addEventListener("resize", measure);
  });

  onDestroy(() => {
    window.removeEventListener("resize", measure);
  });
</script>

<div class="deck-summary">
  <p bind:this={paragraph} class="deck-summary__text" class:deck-summary__text--clamped={!expanded}>{text}</p>
  <div class="deck-summary__links" hidden={!overflowing && !reviewLabel}>
    <button
      type="button"
      class="deck-summary__link"
      hidden={!overflowing}
      aria-expanded={expanded}
      on:click={toggle}
    >
      {toggleLabel}
    </button>
    <button type="button" class="deck-summary__link" hidden={!reviewLabel} on:click={() => dispatch("review")}>
      {reviewLabel}
    </button>
  </div>
</div>

<style>
  .deck-summary {
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-xs);
  }

  .deck-summary__text {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.55;
    color: var(--fc-text-muted);
  }

  .deck-summary__text--clamped {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .deck-summary__links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fc-space-xs) var(--fc-space-md);
  }

  .deck-summary__links[hidden],
  .deck-summary__link[hidden] {
    display: none;
  }

  .deck-summary__link {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--fc-primary-hover);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .deck-summary__link:hover {
    color: var(--fc-primary);
  }

  .deck-summary__link:focus-visible {
    outline: 3px solid var(--fc-primary-soft);
    outline-offset: 2px;
    border-radius: 2px;
  }
</style>
