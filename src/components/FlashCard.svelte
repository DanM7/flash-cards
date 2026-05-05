<script lang="ts">
  export let prompt = "";
  export let cue = "Say this word";
</script>

<article class="flash">
  <p class="flash__label">{cue}</p>
  <p class="flash__word">{prompt}</p>
</article>

<style>
  .flash {
    position: relative;
    overflow: hidden;
    padding: clamp(1.75rem, 5vw, 2.5rem) clamp(1.25rem, 4vw, 2rem);
    border-radius: var(--fc-radius-lg);
    background: linear-gradient(145deg, #fff 0%, #f0fdfa 50%, #ecfdf5 100%);
    border: 1px solid rgba(13, 148, 136, 0.25);
    box-shadow: var(--fc-shadow-lg);
    text-align: center;
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
    font-size: clamp(2.25rem, 10vw, 3.25rem);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--fc-text);
    word-break: break-word;
  }
</style>
