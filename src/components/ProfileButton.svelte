<script lang="ts">
  export let label = "Your scores";
</script>

<button type="button" class="fc-profile" aria-label={label} title={label} on:click>
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle cx="12" cy="8" r="4.25" fill="currentColor" />
    <path d="M3.5 21a8.5 8.5 0 0 1 17 0z" fill="currentColor" />
  </svg>
</button>

<style>
  .fc-profile {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--fc-border);
    background: var(--fc-surface);
    color: var(--fc-primary);
    box-shadow: var(--fc-shadow-sm);
    cursor: pointer;
    transition:
      color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.14s ease;
  }

  .fc-profile:hover {
    color: var(--fc-primary-hover);
    box-shadow: var(--fc-shadow-md);
  }

  .fc-profile:active {
    transform: scale(0.96);
  }

  .fc-profile:focus-visible {
    outline: 3px solid var(--fc-primary-soft);
    outline-offset: 2px;
  }
</style>
