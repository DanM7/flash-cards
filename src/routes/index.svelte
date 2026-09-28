<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import {
    colorForSubject,
    gradeOptions,
    getDecksForGrade,
    getDeckOptionById,
    subjectAreasByGrade,
    unitsBySubjectArea,
    type DeckOption,
    type GradeLevel,
    type SubjectArea
  } from "../data/decks";

  const dispatch = createEventDispatcher<{
    start: {
      deckId: string;
      useMicrophone: boolean;
      interaction: DeckOption["interaction"];
      timed: boolean;
    };
  }>();

  let selectedGrade: GradeLevel | null = null;
  let selectedArea: SubjectArea | null = null;

  $: subjects =
    selectedGrade == null
      ? []
      : getDecksForGrade(selectedGrade).filter(
          (option) => selectedArea == null || option.subject === selectedArea
        );

  $: areas = selectedGrade == null ? undefined : subjectAreasByGrade[selectedGrade];

  $: gradeLabel = gradeOptions.find((option) => option.grade === selectedGrade)?.label ?? "";

  $: selectedAreaLabel = areas?.find((area) => area.id === selectedArea)?.label ?? "";

  $: headingTitle = selectedArea != null ? `${gradeLabel} · ${selectedAreaLabel}` : gradeLabel;

  const readNavFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const grade = gradeOptions.find((option) => String(option.grade) === params.get("grade"))?.grade ?? null;
    const subject = params.get("subject");
    const area =
      grade == null
        ? undefined
        : subjectAreasByGrade[grade]?.find((option) => option.id === subject && option.available);
    selectedGrade = grade;
    selectedArea = area?.id ?? null;
  };

  /** Always writes both keys so the home page reads `?grade=&subject=`. */
  const writeNavToUrl = (mode: "push" | "replace") => {
    const params = new URLSearchParams(window.location.search);
    params.set("grade", selectedGrade == null ? "" : String(selectedGrade));
    params.set("subject", selectedArea ?? "");
    const url = `${window.location.pathname}?${params}${window.location.hash}`;
    if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      return;
    }
    if (mode === "push") {
      history.pushState(null, "", url);
    } else {
      history.replaceState(null, "", url);
    }
  };

  onMount(() => {
    readNavFromUrl();
    writeNavToUrl("replace");
    window.addEventListener("popstate", readNavFromUrl);
  });

  onDestroy(() => {
    window.removeEventListener("popstate", readNavFromUrl);
  });

  const chooseGrade = (grade: GradeLevel) => {
    selectedGrade = grade;
    selectedArea = null;
    writeNavToUrl("push");
  };

  const chooseArea = (area: SubjectArea) => {
    selectedArea = area;
    writeNavToUrl("push");
  };

  const goBack = () => {
    if (selectedArea != null) {
      selectedArea = null;
    } else {
      selectedGrade = null;
    }
    writeNavToUrl("push");
  };

  const startDeck = (option: DeckOption, useMicrophone: boolean, timed = false) => {
    dispatch("start", {
      deckId: option.id,
      useMicrophone: option.interaction === "multiple-choice" ? false : useMicrophone,
      interaction: option.interaction,
      timed
    });
  };
</script>

<section class="home fc-surface">
  <header class="home__brand">
    <span class="home__logo" aria-hidden="true">✦</span>
    <h1 class="home__title">Flash Cards</h1>
    <p class="home__tagline">Practice that fits your grade</p>
  </header>

  {#if selectedGrade == null}
    <div class="home__intro">
      <p class="home__lead">
        Short practice rounds for reading, math, science, and French. Pick a grade, choose a topic, and work through shuffled cards at your own pace.
      </p>
    </div>

    <div class="home-grades">
      {#each gradeOptions as option (option.grade)}
        <button
          type="button"
          class="home-grade home-grade--g{option.grade}"
          on:click={() => chooseGrade(option.grade)}
        >
          <span class="home-grade__badge">Grade {option.grade}</span>
          <span class="home-grade__title">{option.label}</span>
          <span class="home-grade__subjects">
            {#each option.subjects as subject (subject.label)}
              <span class="home-grade__subject home-grade__subject--{colorForSubject(subject.subject) ?? ''}">
                <strong>{subject.label}:</strong>
                {subject.summary}
              </span>
            {/each}
          </span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="home__subject-head">
      <button type="button" class="fc-btn fc-btn--quiet home__back" on:click={goBack}>
        {selectedArea != null ? `← ${gradeLabel}` : "← Grades"}
      </button>
      <h2 class="home__subject-title">{headingTitle}</h2>
      <p class="home__hint">
        {#if selectedGrade === 4}
          Start with typing or the microphone. Cards shuffle every round.
        {:else if areas && selectedArea == null}
          Pick a subject.
        {:else}
          Multiple choice — Practice at your own pace, or Timed with 20 seconds per question.
        {/if}
      </p>
    </div>

    {#if areas && selectedArea == null}
      <div class="home-grades">
        {#each areas as area (area.id)}
          <button
            type="button"
            class="home-grade home-grade--{colorForSubject(area.id) ?? ''}"
            disabled={!area.available}
            on:click={() => chooseArea(area.id)}
          >
            <span class="home-grade__badge">{area.available ? gradeLabel : "Coming soon"}</span>
            <span class="home-grade__title">{area.label}</span>
            <span class="home-grade__blurb">{area.blurb}</span>
          </button>
        {/each}
      </div>
    {:else if selectedGrade === 6 && selectedArea != null}
      <div class="home-topics" role="list">
        {#each unitsBySubjectArea[selectedArea] as unit (unit.unit)}
          {@const option = unit.deckId ? getDeckOptionById(unit.deckId) : null}
          <article
            class="home-topic home-topic--{colorForSubject(selectedArea) ?? ''}"
            class:home-topic--disabled={!option}
            role="listitem"
          >
            <div class="home-topic__top">
              <span class="home-topic__badge">
                {selectedAreaLabel} · Unit {unit.unit}{option ? "" : " · Coming soon"}
              </span>
              <h2 class="home-topic__title">Unit {unit.unit}: {unit.title}</h2>
            </div>
            <p class="home-topic__desc">
              {option ? option.description : "Practice for this unit will be added once the details are ready."}
            </p>
            <div class="home-topic__actions">
              <button
                type="button"
                class="fc-btn fc-btn--ghost home-topic__btn"
                disabled={!option}
                on:click={() => option && startDeck(option, false, false)}
              >
                Practice
              </button>
              <button
                type="button"
                class="fc-btn fc-btn--accent home-topic__btn"
                disabled={!option}
                on:click={() => option && startDeck(option, false, true)}
              >
                <span class="home-topic__icon" aria-hidden="true">⏱</span>
                Timed
              </button>
            </div>
          </article>
        {/each}
      </div>
    {:else}
    <div class="home-topics" role="list">
      {#each subjects as option (option.id)}
        <article
          class="home-topic home-topic--{colorForSubject(option.subject) ?? ''}"
          role="listitem"
        >
          <div class="home-topic__top">
            <span class="home-topic__badge">{option.badge}</span>
            <h2 class="home-topic__title">{option.title}</h2>
          </div>
          <p class="home-topic__desc">{option.description}</p>
          <div class="home-topic__actions">
            {#if option.interaction === "multiple-choice"}
              <button
                type="button"
                class="fc-btn fc-btn--ghost home-topic__btn"
                on:click={() => startDeck(option, false, false)}
              >
                Practice
              </button>
              <button
                type="button"
                class="fc-btn fc-btn--accent home-topic__btn"
                on:click={() => startDeck(option, false, true)}
              >
                <span class="home-topic__icon" aria-hidden="true">⏱</span>
                Timed
              </button>
            {:else}
              <button
                type="button"
                class="fc-btn fc-btn--ghost home-topic__btn"
                on:click={() => startDeck(option, false)}
              >
                <span class="home-topic__icon" aria-hidden="true">⌨</span>
                Typing
              </button>
              <button
                type="button"
                class="fc-btn fc-btn--accent home-topic__btn"
                on:click={() => startDeck(option, true)}
              >
                <span class="home-topic__icon" aria-hidden="true">🎙</span>
                Microphone
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
    {/if}
  {/if}
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

  .home__hint {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--fc-text-muted);
    opacity: 0.92;
    text-align: center;
  }

  .home__subject-head {
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-sm);
    align-items: center;
  }

  .home__back {
    align-self: flex-start;
  }

  .home__subject-title {
    margin: 0;
    font-size: clamp(1.25rem, 4vw, 1.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fc-text);
  }

  .home-grades {
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-md);
    margin-top: var(--fc-space-xs);
  }

  .home-grade {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--fc-space-xs);
    width: 100%;
    padding: var(--fc-space-lg);
    border-radius: var(--fc-radius-md);
    border: 1px solid var(--fc-border);
    background: linear-gradient(160deg, rgba(240, 253, 250, 0.65) 0%, #fff 55%);
    box-shadow: var(--fc-shadow-sm);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.14s ease;
  }

  .home-grade:hover:not(:disabled) {
    border-color: rgba(13, 148, 136, 0.35);
    box-shadow: var(--fc-shadow-md);
  }

  .home-grade:active:not(:disabled) {
    transform: scale(0.99);
  }

  .home-grade:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    filter: grayscale(1);
  }

  .home-grade__badge {
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

  .home-grade__title {
    font-size: clamp(1.2rem, 3.5vw, 1.45rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fc-text);
  }

  .home-grade__blurb {
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--fc-text-muted);
    font-weight: 500;
  }

  .home-grade__subjects {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .home-grade__subject {
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--fc-text-muted);
    font-weight: 500;
  }

  .home-grade__subject strong {
    color: var(--fc-text);
    font-weight: 800;
  }

  /* Grade colors: 2nd sky, 3rd violet, 4th teal, 5th rose, 6th orange. */
  .home-grade--g2 {
    background: linear-gradient(160deg, rgba(224, 242, 254, 0.9) 0%, #fff 55%);
    border-color: rgba(2, 132, 199, 0.2);
  }

  .home-grade--g2:hover:not(:disabled) {
    border-color: rgba(2, 132, 199, 0.45);
  }

  .home-grade--g2 .home-grade__badge {
    background: rgba(2, 132, 199, 0.12);
    color: #0369a1;
  }

  .home-grade--g3 {
    background: linear-gradient(160deg, rgba(237, 233, 254, 0.9) 0%, #fff 55%);
    border-color: rgba(124, 58, 237, 0.2);
  }

  .home-grade--g3:hover:not(:disabled) {
    border-color: rgba(124, 58, 237, 0.45);
  }

  .home-grade--g3 .home-grade__badge {
    background: rgba(124, 58, 237, 0.12);
    color: #6d28d9;
  }

  .home-grade--g4 {
    border-color: rgba(13, 148, 136, 0.2);
  }

  .home-grade--g5 {
    background: linear-gradient(160deg, rgba(255, 228, 230, 0.9) 0%, #fff 55%);
    border-color: rgba(225, 29, 72, 0.2);
  }

  .home-grade--g5:hover:not(:disabled) {
    border-color: rgba(225, 29, 72, 0.45);
  }

  .home-grade--g5 .home-grade__badge {
    background: rgba(225, 29, 72, 0.1);
    color: #be123c;
  }

  .home-grade--g6 {
    background: linear-gradient(160deg, rgba(255, 247, 237, 0.85) 0%, #fff 55%);
    border-color: rgba(234, 88, 12, 0.18);
  }

  .home-grade--g6:hover:not(:disabled) {
    border-color: rgba(234, 88, 12, 0.4);
  }

  .home-grade--g6 .home-grade__badge {
    background: var(--fc-accent-soft);
    color: #c2410c;
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

  /* Subject colors (see subjectColors in data/decks.ts). */
  .home-grade--red,
  .home-topic--red {
    background: linear-gradient(160deg, rgba(254, 226, 226, 0.9) 0%, #fff 55%);
    border-color: rgba(220, 38, 38, 0.2);
  }

  .home-grade--red:hover:not(:disabled) {
    border-color: rgba(220, 38, 38, 0.45);
  }

  .home-grade--red .home-grade__badge,
  .home-topic--red .home-topic__badge {
    background: rgba(220, 38, 38, 0.1);
    color: #b91c1c;
  }

  .home-grade__subject--red strong {
    color: #b91c1c;
  }

  .home-grade--green,
  .home-topic--green {
    background: linear-gradient(160deg, rgba(220, 252, 231, 0.9) 0%, #fff 55%);
    border-color: rgba(22, 163, 74, 0.2);
  }

  .home-grade--green:hover:not(:disabled) {
    border-color: rgba(22, 163, 74, 0.45);
  }

  .home-grade--green .home-grade__badge,
  .home-topic--green .home-topic__badge {
    background: rgba(22, 163, 74, 0.12);
    color: #15803d;
  }

  .home-grade__subject--green strong {
    color: #15803d;
  }

  .home-grade--purple,
  .home-topic--purple {
    background: linear-gradient(160deg, rgba(243, 232, 255, 0.9) 0%, #fff 55%);
    border-color: rgba(147, 51, 234, 0.2);
  }

  .home-grade--purple:hover:not(:disabled) {
    border-color: rgba(147, 51, 234, 0.45);
  }

  .home-grade--purple .home-grade__badge,
  .home-topic--purple .home-topic__badge {
    background: rgba(147, 51, 234, 0.12);
    color: #7e22ce;
  }

  .home-grade__subject--purple strong {
    color: #7e22ce;
  }

  .home-grade--blue,
  .home-topic--blue {
    background: linear-gradient(160deg, rgba(219, 234, 254, 0.9) 0%, #fff 55%);
    border-color: rgba(37, 99, 235, 0.2);
  }

  .home-grade--blue:hover:not(:disabled) {
    border-color: rgba(37, 99, 235, 0.45);
  }

  .home-grade--blue .home-grade__badge,
  .home-topic--blue .home-topic__badge {
    background: rgba(37, 99, 235, 0.12);
    color: #1d4ed8;
  }

  .home-grade__subject--blue strong {
    color: #1d4ed8;
  }

  .home-grade--yellow,
  .home-topic--yellow {
    background: linear-gradient(160deg, rgba(254, 249, 195, 0.9) 0%, #fff 55%);
    border-color: rgba(202, 138, 4, 0.25);
  }

  .home-grade--yellow:hover:not(:disabled) {
    border-color: rgba(202, 138, 4, 0.5);
  }

  .home-grade--yellow .home-grade__badge,
  .home-topic--yellow .home-topic__badge {
    background: rgba(234, 179, 8, 0.18);
    color: #a16207;
  }

  .home-grade__subject--yellow strong {
    color: #a16207;
  }

  .home-grade--orange,
  .home-topic--orange {
    background: linear-gradient(160deg, rgba(255, 237, 213, 0.9) 0%, #fff 55%);
    border-color: rgba(234, 88, 12, 0.2);
  }

  .home-grade--orange:hover:not(:disabled) {
    border-color: rgba(234, 88, 12, 0.45);
  }

  .home-grade--orange .home-grade__badge,
  .home-topic--orange .home-topic__badge {
    background: var(--fc-accent-soft);
    color: #c2410c;
  }

  .home-grade__subject--orange strong {
    color: #c2410c;
  }

  .home-topic--disabled {
    opacity: 0.6;
    filter: grayscale(1);
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
