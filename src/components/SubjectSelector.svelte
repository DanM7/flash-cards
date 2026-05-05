<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { DeckOption } from "../data/decks";

  export let options: DeckOption[] = [];
  const dispatch = createEventDispatcher<{ select: DeckOption }>();

  const choose = (option: DeckOption) => dispatch("select", option);
</script>

<section>
  <h2>Choose Flash Card Type</h2>
  <div class="list">
    {#each options as option}
      <button type="button" on:click={() => choose(option)}>{option.title}</button>
    {/each}
  </div>
</section>

<style>
  .list {
    display: grid;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  button {
    text-align: left;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    background: #ffffff;
    border-radius: 0.5rem;
    cursor: pointer;
  }
</style>
