<script lang="ts">
  export let label = "Home";
</script>

<button type="button" class="fc-home" aria-label={label} title={label} on:click>
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
    />
  </svg>
</button>

<style>
  .fc-home {
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

  .fc-home:hover {
    color: var(--fc-primary-hover);
    box-shadow: var(--fc-shadow-md);
  }

  .fc-home:active {
    transform: scale(0.96);
  }

  .fc-home:focus-visible {
    outline: 3px solid var(--fc-primary-soft);
    outline-offset: 2px;
  }
</style>
