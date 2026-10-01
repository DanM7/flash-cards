<script lang="ts">
  import { onDestroy } from "svelte";
  import { speak, stopSpeaking, type Voice } from "../nlp/SpeechSynthesizer";

  /** Read aloud, never shown. */
  export let text: string;
  export let cue: string;
  export let voice: Voice;

  let speaking = false;

  const play = (words: string) => {
    speak(words, voice, {
      onStart: () => (speaking = true),
      onEnd: () => (speaking = false)
    });
  };

  // Each new word is read as soon as it appears.
  $: play(text);

  onDestroy(stopSpeaking);
</script>

<article class="listen">
  <p class="listen__label">{cue}</p>
  <div class="listen__waves" class:listen__waves--speaking={speaking} aria-hidden="true">
    <span></span><span></span><span></span><span></span><span></span>
  </div>
  <button type="button" class="fc-btn fc-btn--ghost listen__replay" on:click={() => play(text)}>
    <span aria-hidden="true">🔊</span> Play again
  </button>
</article>

<style>
  .listen {
    position: relative;
    overflow: hidden;
    padding: clamp(1rem, min(5vw, 4vh), 2rem) clamp(1.25rem, 4vw, 2rem);
    border-radius: var(--fc-radius-lg);
    background: linear-gradient(145deg, #fff 0%, #f0fdfa 50%, #ecfdf5 100%);
    border: 1px solid rgba(13, 148, 136, 0.25);
    box-shadow: var(--fc-shadow-lg);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(var(--fc-space-sm), 2vh, var(--fc-space-md));
  }

  .listen__label {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--fc-primary);
  }

  /* Five soft bars that rest low and only move while the word is being read. */
  .listen__waves {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    height: clamp(2rem, 6vh, 2.75rem);
  }

  .listen__waves span {
    width: 0.35rem;
    height: 100%;
    border-radius: 999px;
    background: var(--fc-primary);
    opacity: 0.5;
    transform: scaleY(0.2);
    transition: transform 0.3s ease;
  }

  .listen__waves--speaking span {
    animation: listen-wave 0.9s ease-in-out infinite;
  }

  .listen__waves--speaking span:nth-child(2) {
    animation-delay: 0.15s;
  }

  .listen__waves--speaking span:nth-child(3) {
    animation-delay: 0.3s;
  }

  .listen__waves--speaking span:nth-child(4) {
    animation-delay: 0.45s;
  }

  .listen__waves--speaking span:nth-child(5) {
    animation-delay: 0.6s;
  }

  @keyframes listen-wave {
    0%,
    100% {
      transform: scaleY(0.2);
    }
    50% {
      transform: scaleY(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .listen__waves--speaking span {
      animation: none;
      transform: scaleY(0.6);
    }
  }

  .listen__replay {
    min-width: min(100%, 11rem);
  }
</style>
