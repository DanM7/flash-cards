<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";
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
  let shuffledCards: Card[] = [];
  let shuffledChoices: string[] = [];
  let selectedChoice: string | null = null;
  let feedback: "correct" | "incorrect" | null = null;
  let encouragementBreak = false;
  let encouragementMessage = "";
  let locked = false;
  let score = 0;
  let potential = 0;
  let wrongAttempts = 0;
  let usedHint = false;
  let lastPointsEarned: number | null = null;
  let hintOpen = false;
  let completedRoundNumber = 0;
  let timeLeftMs = TIME_LIMIT_MS;
  let timedOut = false;
  let paused = false;
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
    selectedChoice = null;
    feedback = null;
    locked = false;
    wrongAttempts = 0;
    usedHint = false;
    lastPointsEarned = null;
    hintOpen = false;
    timedOut = false;
    paused = false;
    timeLeftMs = TIME_LIMIT_MS;
  };

  $: if (deck) {
    shuffledCards = shuffle(deck.cards);
    currentCardIndex = 0;
    score = 0;
    potential = 0;
    encouragementBreak = false;
    completedRoundNumber = 0;
    resetCardState();
    prepareCardChoices(shuffledCards[0]);
    startTimer();
  }

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

  $: isMath = deck.subject === "math";
  $: isDecimal = deck.subject === "math" && deck.operation === "decimal-operations";

  $: playTitle =
    deck.subject === "math" && deck.operation === "decimal-operations"
      ? "Decimal Operations"
      : deck.subject === "math"
        ? "Math facts"
        : deck.subject === "science"
          ? "Science"
          : deck.subject === "french"
            ? "French"
            : "Practice";

  $: playSubtitleBase =
    (deck.subject === "math" || deck.subject === "science" || deck.subject === "french") &&
    deck.unitLabel
      ? deck.unitLabel
      : deck.subject === "math" && deck.grade
        ? `Grade ${deck.grade}`
        : "Multiple choice";

  $: playSubtitle = `${playSubtitleBase} · ${timed ? "Timed" : "Practice"}`;

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
    encouragementMessage =
      ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)] ??
      "Nice job!";
    completedRoundNumber = roundJustFinished;
    encouragementBreak = true;
  };

  const startNextRound = () => {
    if (!encouragementBreak) {
      return;
    }
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
    lastPointsEarned = points;
    advanceAfterCard(650);
  };

  const choose = (choice: string) => {
    if (!currentCard || locked || paused || encouragementBreak || feedback === "correct") {
      return;
    }
    selectedChoice = choice;
    if (isCorrectChoice(choice, currentCard)) {
      stopTimer();
      feedback = "correct";
      locked = true;
      afterCorrect(pointsForCard(wrongAttempts, usedHint));
      return;
    }
    wrongAttempts += 1;
    feedback = "incorrect";
  };

  const skipCard = () => {
    if (encouragementBreak || locked || paused) {
      return;
    }
    stopTimer();
    potential += POINTS_FIRST_TRY;
    advanceAfterCard();
  };

  const nextAfterTimeUp = () => {
    if (!timedOut) {
      return;
    }
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

  function handleTimeUp() {
    stopTimer();
    if (!currentCard || locked || encouragementBreak) {
      return;
    }
    timedOut = true;
    locked = true;
    feedback = null;
    selectedChoice = null;
    hintOpen = false;
    potential += POINTS_FIRST_TRY;
  }

  const tryAgain = () => {
    selectedChoice = null;
    feedback = null;
  };

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

        <FlashCard
          prompt={paused ? "PAUSED" : currentCard.prompt}
          cue={paused ? "Tap Resume to keep going" : isMath ? "Solve this" : "Answer this"}
          compact={!isMath && !paused}
        />

        <div class="fc-panel fc-surface">
          <p class="fc-label">Choose the answer</p>
          <div class="fc-choices" role="group" aria-label="Answer choices">
            {#each shuffledChoices as choice, index (choice)}
              <button
                type="button"
                class="fc-choice"
                class:fc-choice--selected={!paused && selectedChoice === choice}
                class:fc-choice--correct={(feedback === "correct" && selectedChoice === choice) ||
                  (timedOut && isCorrectChoice(choice, currentCard))}
                class:fc-choice--wrong={!paused && feedback === "incorrect" && selectedChoice === choice}
                disabled={locked || paused || encouragementBreak}
                on:click={() => choose(choice)}
              >
                {paused ? CHOICE_LETTERS[index] : choice}
              </button>
            {/each}
          </div>

          <div class="fc-actions fc-actions--stack">
            {#if timed}
              <div class="fc-timed-row">
                <button
                  type="button"
                  class="fc-btn fc-btn--ghost"
                  on:click={togglePause}
                  disabled={encouragementBreak || locked}
                >
                  {paused ? "Resume" : "Pause"}
                </button>
                {#if timedOut}
                  <button type="button" class="fc-btn fc-btn--next" on:click={nextAfterTimeUp}>
                    Next →
                  </button>
                {:else}
                  <button
                    type="button"
                    class="fc-btn fc-btn--ghost"
                    on:click={skipCard}
                    disabled={encouragementBreak || locked || paused}
                  >
                    Skip
                  </button>
                {/if}
              </div>
            {:else}
              <button
                type="button"
                class="fc-btn fc-btn--ghost fc-actions__full"
                on:click={skipCard}
                disabled={encouragementBreak || locked}
              >
                Skip
              </button>
            {/if}
            {#if currentCard.hint}
              <button
                type="button"
                class="fc-btn fc-btn--ghost fc-actions__full"
                on:click={toggleHint}
                disabled={encouragementBreak || locked || paused}
                aria-expanded={hintOpen}
              >
                {hintOpen ? "Hide hint" : "Hint"}
              </button>
            {/if}
            {#if hintOpen && !paused && currentCard.hint}
              <div class="fc-hint-panel" role="note">
                <p class="fc-hint-panel__label">Hint</p>
                <p class="fc-hint-panel__body">{currentCard.hint}</p>
              </div>
            {/if}
            {#if feedback === "incorrect" && !paused}
              <button type="button" class="fc-btn fc-btn--primary fc-actions__full" on:click={tryAgain}>
                Try again
              </button>
            {/if}
          </div>

          {#if timedOut}
            <div class="fc-feedback fc-feedback--bad">
              <strong>Time's up! +0</strong>
              The answer was {currentCard.answers[0]}.
            </div>
          {:else if feedback === "correct"}
            <div class="fc-feedback fc-feedback--ok">
              <strong>Nice!{lastPointsEarned != null ? ` +${lastPointsEarned}` : ""}</strong>
              That’s correct.
            </div>
          {:else if feedback === "incorrect"}
            <div class="fc-feedback fc-feedback--bad">
              <strong>Not quite.</strong>
              {isDecimal
                ? "Check the operation and decimal place, then try again."
                : isMath
                  ? "Check your work, then try again."
                  : "Give it another try."}
            </div>
          {/if}
        </div>
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
    gap: var(--fc-space-md);
    flex: 1;
  }

  .fc-play__stage {
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-md);
    flex: 1;
    min-height: 0;
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
    padding: var(--fc-space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-md);
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
    gap: var(--fc-space-sm);
  }

  .fc-choice {
    width: 100%;
    min-height: 3rem;
    padding: 0.75rem 1rem;
    border-radius: var(--fc-radius-md);
    border: 2px solid var(--fc-border-strong);
    background: #fafafa;
    color: var(--fc-text);
    font-family: inherit;
    font-size: 1.125rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    cursor: pointer;
    text-align: center;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      transform 0.14s ease;
  }

  .fc-choice:hover:not(:disabled) {
    border-color: rgba(13, 148, 136, 0.45);
    background: var(--fc-primary-soft);
  }

  .fc-choice:active:not(:disabled) {
    transform: scale(0.98);
  }

  .fc-choice:disabled {
    cursor: default;
  }

  .fc-choice--selected {
    border-color: var(--fc-primary);
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

  .fc-actions__full {
    width: 100%;
  }

  .fc-timed-row {
    display: flex;
    justify-content: space-between;
    gap: var(--fc-space-sm);
  }

  .fc-timed-row .fc-btn {
    min-width: 7.5rem;
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

  .fc-feedback {
    margin: 0;
    padding: var(--fc-space-md);
    border-radius: var(--fc-radius-md);
    font-size: 0.9375rem;
    line-height: 1.45;
  }

  .fc-feedback strong {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 800;
  }

  .fc-feedback--ok {
    background: var(--fc-success-soft);
    color: #065f46;
    border: 1px solid rgba(5, 150, 105, 0.35);
  }

  .fc-feedback--bad {
    background: var(--fc-danger-soft);
    color: #991b1b;
    border: 1px solid rgba(220, 38, 38, 0.22);
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

  @media (min-width: 520px) {
    .fc-choices {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
