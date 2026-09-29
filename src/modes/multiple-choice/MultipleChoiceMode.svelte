<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";
  import CountryMap from "../../components/CountryMap.svelte";
  import FlashCard from "../../components/FlashCard.svelte";
  import type { Card, SubjectDeck } from "../../data/CardTypes";
  import { ROUND_SIZE } from "../../data/subjects/math/decimalOperations";

  export let deck: SubjectDeck;
  export let timed = false;
  const dispatch = createEventDispatcher<{ back: void }>();

  const ENCOURAGEMENT_MESSAGES = ["Great job!", "Nice work!", "You're doing awesome!", "Way to go!", "Super!"];
  const POINTS_FIRST_TRY = 10;
  const POINTS_PER_WRONG = 3;
  const POINTS_HINT = 1;
  const POINTS_MIN = 1;
  const TIME_LIMIT_MS = 20_000;
  const TIMER_TICK_MS = 100;
  const TIME_LOW_MS = 5_000;
  const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

  let currentCardIndex = 0;
  let shuffledChoices: string[] = [];
  let correctChoice: string | null = null;
  /** Every wrong pick on the current card, so they all stay red. */
  let wrongChoices: string[] = [];
  let encouragementBreak = false;
  let encouragementMessage = "";
  let locked = false;
  let score = 0;
  let potential = 0;
  let wrongAttempts = 0;
  let usedHint = false;
  let hintOpen = false;
  let completedRoundNumber = 0;
  let timeLeftMs = TIME_LIMIT_MS;
  let timedOut = false;
  let paused = false;
  /** Every game opens on a "Ready?" card; the first question and timer wait for a tap. */
  let ready = true;
  let timerId: number | null = null;

  const stopTimer = () => {
    if (timerId != null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  };

  const startTimer = (durationMs = TIME_LIMIT_MS) => {
    stopTimer();
    if (!timed) {
      return;
    }
    const deadline = performance.now() + durationMs;
    timeLeftMs = durationMs;
    timerId = window.setInterval(() => {
      timeLeftMs = Math.max(0, deadline - performance.now());
      if (timeLeftMs === 0) {
        handleTimeUp();
      }
    }, TIMER_TICK_MS);
  };

  onDestroy(stopTimer);

  const shuffle = <T>(items: T[]): T[] => {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  };

  const pointsForCard = (wrongs: number, hintUsed: boolean): number =>
    Math.max(
      POINTS_MIN,
      POINTS_FIRST_TRY - wrongs * POINTS_PER_WRONG - (hintUsed ? POINTS_HINT : 0)
    );

  const isCorrectChoice = (choice: string, card: Card): boolean => {
    const normalized = choice.trim().toLowerCase();
    return card.answers.some((answer) => answer.trim().toLowerCase() === normalized);
  };

  const prepareCardChoices = (card: Card | undefined) => {
    if (!card) {
      shuffledChoices = [];
      return;
    }
    const source =
      card.choices && card.choices.length >= 2
        ? card.choices
        : card.answers.slice(0, 1);
    shuffledChoices = shuffle(source);
  };

  const resetCardState = () => {
    correctChoice = null;
    wrongChoices = [];
    locked = false;
    wrongAttempts = 0;
    usedHint = false;
    hintOpen = false;
    timedOut = false;
    paused = false;
    timeLeftMs = TIME_LIMIT_MS;
  };

  // The deck and mode are fixed for this screen; the app remounts it to play another deck.
  const shuffledCards = shuffle(deck.cards);
  prepareCardChoices(shuffledCards[0]);

  const begin = () => {
    ready = false;
    startTimer();
  };

  /*
   * Pointerdown rather than click: the click that opened the game can still be
   * bubbling to window when this screen mounts, and would skip straight past Ready.
   */
  const beginOnPointer = (event: PointerEvent) => {
    if (ready && !(event.target as Element).closest("a, button")) {
      begin();
    }
  };

  const beginOnKey = (event: KeyboardEvent) => {
    if (ready && (event.key === "Enter" || event.key === " ") && !(event.target as Element).closest("a, button")) {
      event.preventDefault();
      begin();
    }
  };

  $: timerPercent = (timeLeftMs / TIME_LIMIT_MS) * 100;
  $: timerSeconds = Math.ceil(timeLeftMs / 1000);

  $: currentCard = shuffledCards[currentCardIndex] as Card | undefined;

  $: roundSize = Math.max(1, Math.min(ROUND_SIZE, shuffledCards.length));
  $: totalRounds = Math.max(1, Math.ceil(shuffledCards.length / roundSize));

  $: currentRound =
    shuffledCards.length === 0 || currentCardIndex >= shuffledCards.length
      ? totalRounds
      : Math.floor(currentCardIndex / roundSize) + 1;

  $: cardInRound =
    shuffledCards.length === 0 || currentCardIndex >= shuffledCards.length
      ? roundSize
      : (currentCardIndex % roundSize) + 1;

  $: progressPercent =
    shuffledCards.length === 0
      ? 100
      : Math.min(100, Math.round((currentCardIndex / shuffledCards.length) * 100));

  $: percentageDisplay = potential === 0 ? "—" : `${Math.round((score / potential) * 100)}%`;

  $: scoreDisplay = `Score: ${score} · Percentage: ${percentageDisplay}`;

  $: progressDisplay =
    shuffledCards.length === 0
      ? ""
      : currentCardIndex >= shuffledCards.length
        ? `Deck complete · ${scoreDisplay}`
        : totalRounds === 1
          ? `Card ${cardInRound} of ${roundSize} · ${scoreDisplay}`
          : `Round ${currentRound} of ${totalRounds} · Card ${cardInRound} of ${roundSize} · ${scoreDisplay}`;

  $: pauseLabel = paused ? "Resume" : "Pause";
  $: hintLabel = hintOpen ? "Hide hint" : "Hint";
  $: hintPanelOpen = hintOpen && !paused;
  $: hintText = currentCard?.hint ?? "";
  /** While paused the answers show as letters, so the question can't be read off the buttons. */
  $: choiceLabels = shuffledChoices.map((choice, index) => (paused ? CHOICE_LETTERS[index] : choice));

  const showsAsCorrect = (choice: string, picked: string | null, revealed: boolean, card: Card): boolean =>
    picked === choice || (revealed && isCorrectChoice(choice, card));

  const isMath = deck.subject === "math";
  const isDecimal = deck.subject === "math" && deck.operation === "decimal-operations";

  const playTitle =
    deck.subject === "math" && deck.operation === "decimal-operations"
      ? "Decimal Operations"
      : deck.subject === "math"
        ? "Math facts"
        : deck.subject === "science"
          ? "Science"
          : deck.subject === "french"
            ? "French"
            : deck.subject === "geography"
              ? "Geography"
              : "Practice";

  const playSubtitleBase =
    (deck.subject === "math" ||
      deck.subject === "science" ||
      deck.subject === "french" ||
      deck.subject === "geography") &&
    deck.unitLabel
      ? deck.unitLabel
      : deck.subject === "math" && deck.grade
        ? `Grade ${deck.grade}`
        : "Multiple choice";

  const playSubtitle = `${playSubtitleBase} · ${timed ? "Timed" : "Practice"}`;

  const goToNextCard = () => {
    if (currentCardIndex < shuffledCards.length - 1) {
      currentCardIndex += 1;
      prepareCardChoices(shuffledCards[currentCardIndex]);
    } else {
      currentCardIndex = shuffledCards.length;
      shuffledChoices = [];
    }
    resetCardState();
  };

  const triggerEncouragementBreak = (roundJustFinished: number) => {
    encouragementMessage = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
    completedRoundNumber = roundJustFinished;
    encouragementBreak = true;
  };

  const startNextRound = () => {
    encouragementBreak = false;
    startTimer();
  };

  /** Advance one card; pause between rounds (every 10 cards) when more remain. */
  const advanceAfterCard = (delayMs = 0) => {
    const finishedRoundBoundary =
      (currentCardIndex + 1) % roundSize === 0 && currentCardIndex + 1 < shuffledCards.length;
    const roundJustFinished = Math.floor(currentCardIndex / roundSize) + 1;
    const advance = () => {
      goToNextCard();
      if (finishedRoundBoundary) {
        triggerEncouragementBreak(roundJustFinished);
      } else if (currentCardIndex < shuffledCards.length) {
        startTimer();
      }
    };
    if (delayMs > 0) {
      window.setTimeout(advance, delayMs);
    } else {
      advance();
    }
  };

  const afterCorrect = (points: number) => {
    score += points;
    potential += POINTS_FIRST_TRY;
    advanceAfterCard(650);
  };

  const choose = (choice: string) => {
    if (!currentCard || locked || paused || encouragementBreak || wrongChoices.includes(choice)) {
      return;
    }
    if (isCorrectChoice(choice, currentCard)) {
      stopTimer();
      correctChoice = choice;
      locked = true;
      afterCorrect(pointsForCard(wrongAttempts, usedHint));
      return;
    }
    wrongAttempts += 1;
    wrongChoices = [...wrongChoices, choice];
  };

  const skipCard = () => {
    if (encouragementBreak || locked || paused) {
      return;
    }
    stopTimer();
    potential += POINTS_FIRST_TRY;
    advanceAfterCard();
  };

  const togglePause = () => {
    if (!timed || locked || encouragementBreak) {
      return;
    }
    if (paused) {
      paused = false;
      startTimer(timeLeftMs);
    } else {
      stopTimer();
      paused = true;
    }
  };

  /** The timer only runs while a card is open and unanswered, so there's nothing to check here. */
  function handleTimeUp() {
    stopTimer();
    timedOut = true;
    locked = true;
    hintOpen = false;
    potential += POINTS_FIRST_TRY;
  }

  const toggleHint = () => {
    if (locked || paused || encouragementBreak) {
      return;
    }
    if (!hintOpen) {
      usedHint = true;
    }
    hintOpen = !hintOpen;
  };
</script>

<svelte:window on:pointerdown={beginOnPointer} on:keydown={beginOnKey} />

<section class="fc-play">
  <header class="fc-play__header">
    <button type="button" class="fc-btn fc-btn--quiet fc-play__back" on:click={() => dispatch("back")}>
      ← Home
    </button>
    <div class="fc-play__titles">
      <h2 class="fc-play__title">{playTitle}</h2>
      <p class="fc-play__subtitle">{playSubtitle}</p>
    </div>
  </header>

  {#if currentCard}
    <div class="fc-play__stage">
      <div class="fc-progress" aria-label="Progress through deck">
        <div class="fc-progress__track">
          <div class="fc-progress__fill" style="width: {progressPercent}%"></div>
        </div>
        <p class="fc-progress__text">{progressDisplay}</p>
      </div>

      {#if encouragementBreak}
        <div class="fc-encourage fc-surface" role="status">
          <p class="fc-encourage__msg">{encouragementMessage}</p>
          <p class="fc-muted">
            Round {completedRoundNumber} of {totalRounds} done · {scoreDisplay}
          </p>
          <button type="button" class="fc-btn fc-btn--primary fc-encourage__next" on:click={startNextRound}>
            Next Round →
          </button>
        </div>
      {:else}
        {#if timed}
          <div
            class="fc-timer"
            class:fc-timer--low={timeLeftMs <= TIME_LOW_MS}
            role="timer"
            aria-label="Time remaining"
          >
            <div class="fc-timer__track">
              <div class="fc-timer__fill" style="width: {timerPercent}%"></div>
            </div>
            <p class="fc-timer__text">{timerSeconds}s</p>
          </div>
        {/if}

        <div class="fc-play__card">
          {#if ready}
            <FlashCard prompt="Ready?" cue="Tap anywhere to begin" />
          {:else}
            <!-- Stays laid out (just hidden) while paused so the PAUSED card matches its size. -->
            <div class="fc-play__question" class:fc-play__question--hidden={paused} aria-hidden={paused}>
              {#if currentCard.map}
                <CountryMap countryId={currentCard.map.countryId} cue={currentCard.prompt} />
              {:else}
                <FlashCard
                  prompt={currentCard.prompt}
                  cue={isMath ? "Solve this" : "Answer this"}
                  compact={!isMath}
                />
              {/if}
            </div>
            <div class="fc-play__overlay" hidden={!paused}>
              <FlashCard
                prompt="PAUSED"
                cue="Tap Resume to keep going"
                compact={!currentCard.map && !isMath}
                fill
              />
            </div>
          {/if}
        </div>

        {#if !ready}
        <div class="fc-panel fc-surface">
          <p class="fc-label">Choose the answer</p>
          <!-- iOS Safari only applies :active to taps when a touchstart listener exists. -->
          <div class="fc-choices" role="group" aria-label="Answer choices" on:touchstart={() => {}}>
            {#each shuffledChoices as choice, index (choice)}
              <button
                type="button"
                class="fc-choice"
                class:fc-choice--correct={showsAsCorrect(choice, correctChoice, timedOut, currentCard)}
                class:fc-choice--wrong={!paused && wrongChoices.includes(choice)}
                disabled={locked || paused || encouragementBreak || wrongChoices.includes(choice)}
                on:click={() => choose(choice)}
              >
                {choiceLabels[index]}
              </button>
            {/each}
          </div>

          <div class="fc-actions fc-actions--stack">
            <!-- Two columns with the answer grid's gap so the buttons line up under the answers. -->
            <div class="fc-action-row">
              {#if timed}
                <button
                  type="button"
                  class="fc-btn fc-btn--ghost fc-action-btn"
                  on:click={togglePause}
                  disabled={encouragementBreak || locked}
                >
                  {pauseLabel}
                </button>
              {:else}
                <button
                  type="button"
                  class="fc-btn fc-btn--ghost fc-action-btn"
                  class:fc-action-row__span={!currentCard.hint}
                  on:click={skipCard}
                  disabled={encouragementBreak || locked}
                >
                  Skip
                </button>
              {/if}
              {#if timed || currentCard.hint}
                <div class="fc-action-pair">
                  {#if currentCard.hint}
                    <button
                      type="button"
                      class="fc-btn fc-btn--ghost fc-action-btn"
                      on:click={toggleHint}
                      disabled={encouragementBreak || locked || paused}
                      aria-expanded={hintOpen}
                    >
                      {hintLabel}
                    </button>
                  {/if}
                  {#if timed && timedOut}
                    <button type="button" class="fc-btn fc-btn--next fc-action-btn" on:click={() => advanceAfterCard()}>
                      Next →
                    </button>
                  {:else if timed}
                    <button
                      type="button"
                      class="fc-btn fc-btn--ghost fc-action-btn"
                      on:click={skipCard}
                      disabled={encouragementBreak || locked || paused}
                    >
                      Skip
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="fc-hint-panel" role="note" hidden={!hintPanelOpen}>
              <p class="fc-hint-panel__label">Hint</p>
              <p class="fc-hint-panel__body">{hintText}</p>
            </div>
          </div>
        </div>
        {/if}
      {/if}
    </div>
  {:else}
    <div class="fc-complete fc-surface">
      <div class="fc-complete__icon" aria-hidden="true">★</div>
      <h3 class="fc-complete__title">You finished the deck!</h3>
      <p class="fc-complete__score">Score: {score}</p>
      <p class="fc-complete__percentage">Percentage: {percentageDisplay}</p>
      <p class="fc-muted">
        {isDecimal ? "Solid decimal practice." : isMath ? "Great math practice." : "Nice studying."}
        Head home when you want another round.
      </p>
      <button type="button" class="fc-btn fc-btn--primary fc-complete__btn" on:click={() => dispatch("back")}>
        Back to home
      </button>
    </div>
  {/if}
</section>

<style>
  .fc-play {
    display: flex;
    flex-direction: column;
    gap: clamp(var(--fc-space-sm), 2vh, var(--fc-space-md));
    flex: 1;
    min-height: 0;
  }

  .fc-play__stage {
    display: flex;
    flex-direction: column;
    gap: clamp(var(--fc-space-sm), 2vh, var(--fc-space-md));
    flex: 1;
    min-height: 0;
  }

  /* The prompt/map is the only part that gives up height when the screen is short. */
  .fc-play__card {
    position: relative;
    flex: 0 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .fc-play__question {
    flex: 0 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .fc-play__question--hidden {
    visibility: hidden;
  }

  .fc-play__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
  }

  .fc-play__overlay[hidden] {
    display: none;
  }

  .fc-play__header {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: var(--fc-space-sm);
  }

  .fc-play__back {
    justify-self: start;
  }

  .fc-play__titles {
    text-align: center;
    min-width: 0;
  }

  .fc-play__title {
    margin: 0;
    font-size: clamp(1.25rem, 4vw, 1.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fc-text);
  }

  .fc-play__subtitle {
    margin: 0.125rem 0 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--fc-text-muted);
  }

  .fc-progress__track {
    height: 0.5rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.08);
    overflow: hidden;
  }

  .fc-progress__fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--fc-primary), #2dd4bf);
    transition: width 0.35s ease;
  }

  .fc-progress__text {
    margin: var(--fc-space-xs) 0 0;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--fc-text-muted);
    text-align: center;
  }

  .fc-timer {
    display: flex;
    align-items: center;
    gap: var(--fc-space-sm);
  }

  .fc-timer__track {
    flex: 1;
    height: 0.75rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.08);
    overflow: hidden;
  }

  .fc-timer__fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #fb923c, var(--fc-accent));
    transition:
      width 0.1s linear,
      background 0.3s ease;
  }

  .fc-timer--low .fc-timer__fill {
    background: linear-gradient(90deg, #f87171, var(--fc-danger));
  }

  .fc-timer__text {
    margin: 0;
    min-width: 2.5rem;
    font-size: 0.9375rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: var(--fc-text-muted);
  }

  .fc-timer--low .fc-timer__text {
    color: var(--fc-danger);
  }

  .fc-encourage {
    padding: var(--fc-space-lg);
    text-align: center;
    border: 1px solid rgba(13, 148, 136, 0.35);
    background: linear-gradient(160deg, #ecfdf5 0%, #fff 55%);
  }

  .fc-encourage__msg {
    margin: 0 0 var(--fc-space-sm);
    font-size: clamp(1.35rem, 4vw, 1.75rem);
    font-weight: 800;
    color: var(--fc-success);
  }

  .fc-encourage__next {
    margin-top: var(--fc-space-md);
    min-width: min(100%, 14rem);
    min-height: 3rem;
  }

  .fc-muted {
    margin: 0;
    color: var(--fc-text-muted);
    font-size: 0.9375rem;
    line-height: 1.45;
  }

  .fc-panel {
    flex: none;
    padding: clamp(var(--fc-space-md), 2.5vh, var(--fc-space-lg));
    display: flex;
    flex-direction: column;
    gap: clamp(var(--fc-space-sm), 1.8vh, var(--fc-space-md));
  }

  .fc-label {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fc-text-soft);
  }

  .fc-choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--fc-space-sm);
  }

  .fc-choice {
    width: 100%;
    min-height: 3rem;
    padding: clamp(0.5rem, 1.5vh, 0.75rem) clamp(0.5rem, 2vw, 1rem);
    border-radius: var(--fc-radius-md);
    border: 2px solid var(--fc-border-strong);
    background: #fafafa;
    color: var(--fc-text);
    font-family: inherit;
    font-size: clamp(0.9375rem, 3.8vw, 1.125rem);
    font-weight: 800;
    letter-spacing: -0.01em;
    line-height: 1.25;
    overflow-wrap: anywhere;
    cursor: pointer;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
    box-shadow: 0 3px 0 rgba(15, 23, 42, 0.12);
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      box-shadow 0.08s ease,
      transform 0.08s ease;
  }

  /* Hover stays neutral: an answer only turns green or red once it's actually chosen. */
  @media (hover: hover) {
    .fc-choice:hover:not(:disabled) {
      border-color: rgba(15, 23, 42, 0.28);
    }
  }

  /* Pressing sinks the button onto its ledge; the layout box never changes size. */
  .fc-choice:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow: 0 0 0 rgba(15, 23, 42, 0.12), inset 0 2px 4px rgba(15, 23, 42, 0.08);
    background: #f1f5f9;
  }

  .fc-choice:disabled {
    cursor: default;
  }

  .fc-choice--correct {
    background: var(--fc-success-soft);
    border-color: rgba(5, 150, 105, 0.45);
    color: #065f46;
  }

  .fc-choice--wrong {
    background: var(--fc-danger-soft);
    border-color: rgba(220, 38, 38, 0.35);
    color: #991b1b;
  }

  .fc-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fc-space-sm);
  }

  .fc-actions--stack {
    flex-direction: column;
  }

  .fc-action-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--fc-space-sm);
  }

  .fc-action-row__span {
    grid-column: 1 / -1;
  }

  .fc-action-pair {
    display: flex;
    gap: var(--fc-space-sm);
  }

  .fc-action-pair > .fc-btn {
    flex: 1 1 0;
  }

  .fc-action-btn {
    min-width: 0;
    padding: 0 0.5rem;
    font-size: 0.8125rem;
  }

  .fc-btn--next {
    background: linear-gradient(180deg, #34d399 0%, var(--fc-success) 100%);
    color: #fff;
    box-shadow: var(--fc-shadow-sm), 0 2px 0 rgba(0, 0, 0, 0.06);
  }

  .fc-btn--next:hover {
    filter: brightness(1.05);
    box-shadow: var(--fc-shadow-md);
  }

  .fc-hint-panel {
    padding: var(--fc-space-md);
    border-radius: var(--fc-radius-md);
    border: 1px solid rgba(202, 138, 4, 0.35);
    background: var(--fc-warning-soft);
  }

  .fc-hint-panel__label {
    margin: 0 0 var(--fc-space-xs);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #854d0e;
  }

  .fc-hint-panel__body {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.5;
    color: #854d0e;
  }

  .fc-complete {
    padding: clamp(2rem, 6vw, 2.75rem) var(--fc-space-lg);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--fc-space-md);
    border: 1px solid rgba(13, 148, 136, 0.25);
    background: linear-gradient(165deg, #fff 0%, #f0fdfa 100%);
  }

  .fc-complete__icon {
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 1.75rem;
    line-height: 1;
    background: linear-gradient(145deg, #fde68a, #fbbf24);
    color: #92400e;
    box-shadow: var(--fc-shadow-md);
  }

  .fc-complete__title {
    margin: 0;
    font-size: clamp(1.35rem, 4vw, 1.65rem);
    font-weight: 800;
    color: var(--fc-text);
  }

  .fc-complete__score {
    margin: 0;
    font-size: clamp(1.5rem, 5vw, 1.85rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fc-primary-hover);
  }

  .fc-complete__percentage {
    margin: calc(var(--fc-space-sm) * -1) 0 0;
    font-size: 1.125rem;
    font-weight: 800;
    color: var(--fc-text-muted);
  }

  .fc-complete__btn {
    min-width: 12rem;
  }
</style>
