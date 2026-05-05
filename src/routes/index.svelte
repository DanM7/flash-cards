<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { deckOptions } from "../data/decks";

  const dispatch = createEventDispatcher<{
    start: { deckId: string; useMicrophone: boolean };
  }>();
</script>

<section class="home fc-surface">
  <header class="home__brand">
    <span class="home__logo" aria-hidden="true">✦</span>
    <h1 class="home__title">Flash Cards</h1>
    <p class="home__tagline">Sight words &amp; addition facts</p>
  </header>

  <div class="home__intro">
    <p class="home__lead">
      Two decks below: <strong>Grade 3 sight words</strong> for reading fluency and <strong>addition facts</strong> (quick sums). Pick one and start with <strong>typing</strong> or the <strong>microphone</strong>.
    </p>
    <p class="home__hint">
      Cards shuffle every time you begin a round. With voice, pause briefly after each answer so it can be scored.
    </p>
  </div>

  <div class="home-topics" role="list">
    {#each deckOptions as option (option.id)}
      <article class="home-topic" class:home-topic--math={option.deck.subject === "math"} role="listitem">
        <div class="home-topic__top">
          <span class="home-topic__badge">{option.badge}</span>
          <h2 class="home-topic__title">{option.title}</h2>
        </div>
        <p class="home-topic__desc">{option.description}</p>
        <div class="home-topic__actions">
          <button
            type="button"
            class="fc-btn fc-btn--ghost home-topic__btn"
            on:click={() => dispatch("start", { deckId: option.id, useMicrophone: false })}
          >
            <span class="home-topic__icon" aria-hidden="true">⌨</span>
            Typing
          </button>
          <button
            type="button"
            class="fc-btn fc-btn--accent home-topic__btn"
            on:click={() => dispatch("start", { deckId: option.id, useMicrophone: true })}
          >
            <span class="home-topic__icon" aria-hidden="true">🎙</span>
            Microphone
          </button>
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .home {
    padding: clamp(1.35rem, 4vw, 2rem);
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-lg);
  }

  .home__brand {
    text-align: center;
  }

  .home__logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: var(--fc-space-sm);
    border-radius: 50%;
    background: linear-gradient(145deg, var(--fc-primary-soft), var(--fc-accent-soft));
    font-size: 1.35rem;
    line-height: 1;
    color: var(--fc-primary);
    box-shadow: var(--fc-shadow-sm);
  }

  .home__title {
    margin: 0;
    font-size: clamp(1.75rem, 6vw, 2.25rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--fc-text);
  }

  .home__tagline {
    margin: var(--fc-space-xs) 0 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fc-text-muted);
  }

  .home__intro {
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-sm);
    max-width: 30rem;
    align-self: center;
    text-align: center;
  }

  .home__lead {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.55;
    color: var(--fc-text-muted);
  }

  .home__lead strong {
    color: var(--fc-text);
    font-weight: 700;
  }

  .home__hint {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--fc-text-muted);
    opacity: 0.92;
  }

  .home-topics {
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-md);
    margin-top: var(--fc-space-xs);
  }

  .home-topic {
    padding: var(--fc-space-lg);
    border-radius: var(--fc-radius-md);
    border: 1px solid var(--fc-border);
    background: linear-gradient(160deg, rgba(240, 253, 250, 0.65) 0%, #fff 55%);
    box-shadow: var(--fc-shadow-sm);
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-md);
  }

  .home-topic--math {
    background: linear-gradient(160deg, rgba(255, 247, 237, 0.85) 0%, #fff 55%);
    border-color: rgba(234, 88, 12, 0.18);
  }

  .home-topic__top {
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-xs);
    align-items: flex-start;
  }

  .home-topic__badge {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--fc-primary-soft);
    color: var(--fc-primary-hover);
  }

  .home-topic--math .home-topic__badge {
    background: var(--fc-accent-soft);
    color: #c2410c;
  }

  .home-topic__title {
    margin: 0;
    font-size: clamp(1.1rem, 3.5vw, 1.35rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fc-text);
    line-height: 1.25;
  }

  .home-topic__desc {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.55;
    color: var(--fc-text-muted);
  }

  .home-topic__actions {
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-sm);
  }

  .home-topic__btn {
    width: 100%;
    justify-content: center;
    min-height: 3rem;
  }

  .home-topic__icon {
    font-size: 1.0625rem;
    opacity: 0.95;
  }

  @media (min-width: 520px) {
    .home-topic__actions {
      flex-direction: row;
    }

    .home-topic__btn {
      flex: 1;
      min-width: 0;
    }
  }
</style>
