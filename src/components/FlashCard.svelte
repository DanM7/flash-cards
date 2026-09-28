<script lang="ts">
  export let prompt = "";
  export let cue = "Say this word";
  /** Smaller text for sentence-length prompts. */
  export let compact = false;
  /** Stretch to the parent's height with the text centered, e.g. to cover another card. */
  export let fill = false;
</script>

<article class="flash" class:flash--fill={fill}>
  <p class="flash__label">{cue}</p>
  <p class="flash__word" class:flash__word--compact={compact}>{prompt}</p>
</article>

<style>
  .flash {
    position: relative;
    overflow: hidden;
    padding: clamp(1rem, min(5vw, 4vh), 2.5rem) clamp(1.25rem, 4vw, 2rem);
    border-radius: var(--fc-radius-lg);
    background: linear-gradient(145deg, #fff 0%, #f0fdfa 50%, #ecfdf5 100%);
    border: 1px solid rgba(13, 148, 136, 0.25);
    box-shadow: var(--fc-shadow-lg);
    text-align: center;
  }

  .flash--fill {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .flash::before {
    content: "";
    position: absolute;
    inset: -40% -20% auto;
    height: 60%;
    background: radial-gradient(
      ellipse at center,
      rgba(13, 148, 136, 0.14) 0%,
      transparent 65%
    );
    pointer-events: none;
  }

  .flash__label {
    position: relative;
    margin: 0 0 var(--fc-space-sm);
    font-size: 0.8125rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--fc-primary);
  }

  .flash__word {
    position: relative;
    margin: 0;
    font-size: clamp(1.75rem, min(10vw, 7vh), 3.25rem);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--fc-text);
    word-break: break-word;
  }

  .flash__word--compact {
    font-size: clamp(1.35rem, 5vw, 1.75rem);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
</style>
