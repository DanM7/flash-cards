<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import SubjectSelector from "../components/SubjectSelector.svelte";
  import type { DeckOption } from "../data/decks";

  export let options: DeckOption[] = [];
  const dispatch = createEventDispatcher<{ back: void; select: DeckOption }>();
</script>

<section>
  <button type="button" class="secondary" on:click={() => dispatch("back")}>Back</button>
  <SubjectSelector {options} on:select={(event) => dispatch("select", event.detail)} />
</section>

<style>
  section {
    display: grid;
    gap: 1rem;
  }

  .secondary {
    width: fit-content;
    padding: 0.4rem 0.8rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: #f8fafc;
    cursor: pointer;
  }
</style>
