<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";
  import FlashCard from "../components/FlashCard.svelte";
  import type { Card, PlayText, SubjectDeck, TypingAndVoiceSettings } from "../data/CardTypes";
  import { AnswerInterpreter, type AnswerInterpretation } from "../nlp/AnswerInterpreter";
  import { SpeechRecognizer } from "../nlp/SpeechRecognizer";

  export let deck: SubjectDeck;
  export let autoMic = false;
  export let settings: TypingAndVoiceSettings;
  export let text: PlayText;
  const dispatch = createEventDispatcher<{ back: void }>();

  // Settings and wording are fixed for this screen, like the deck.
  const { encouragement, cardsBeforeBreak } = settings;
  const { title, typingCue, promptName, finishedTitle, typingFinished } = text;
  const ENCOURAGEMENT_BREAK_MS = settings.breakSeconds * 1000;
  /** Delay before starting recognition again after a break (fresh AudioPipeline). */
  const POST_BREAK_MIC_MS = 1100;
  /** After mic `onstart` post-break, hide the word and ignore scoring briefly so the first real answer isn't eaten. */
  const POST_BREAK_PROMPT_AND_SCORE_MS = 550;

  type TranscriptEntry = {
    cardPrompt: string;
    heard: string[];
    outcome: "correct" | "ambiguous" | "incorrect" | "empty";
  };

  let answerInput = "";
  let feedback: AnswerInterpretation | null = null;
  let speechError = "";
  let liveTranscript = "";
  let liveCandidates: string[] = [];
  let isListening = false;
  let micReady = false;
  let currentCardIndex = 0;
  let transcriptHistory: TranscriptEntry[] = [];
  let encouragementBreak = false;
  let encouragementMessage = "";
  let postBreakMicCooldown = false;
  /** After an encouragement break: wait for mic start + this gate before showing the next word. */
  let hidePromptForPostBreakWarmup = false;
  let suppressFinalScoringUntil = 0;
  let cardsCompletedSinceBreak = 0;
  let sessionPaused = false;

  let latestCard: Card | undefined;
  let latestEncouragementBreak = false;
  let latestAmbiguous = false;
  let latestSessionPaused = false;

  const shuffleCards = (cards: Card[]): Card[] => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // The deck is fixed for this screen; the app remounts it to play another deck.
  const shuffledCards = shuffleCards(deck.cards);

  $: currentCard = shuffledCards[currentCardIndex] as Card | undefined;
  $: micStatusLabel = micReady ? "ready" : "warming up...";

  $: progressPercent =
    shuffledCards.length === 0
      ? 100
      : Math.min(100, Math.round((currentCardIndex / shuffledCards.length) * 100));

  $: progressDisplay =
    shuffledCards.length === 0
      ? ""
      : currentCardIndex >= shuffledCards.length
        ? "Deck complete"
        : `Card ${currentCardIndex + 1} of ${shuffledCards.length}`;

  $: latestCard = currentCard;
  $: latestEncouragementBreak = encouragementBreak;
  $: latestAmbiguous = feedback?.matchType === "ambiguous";
  $: latestSessionPaused = sessionPaused;

  $: showPauseScrim = sessionPaused && !encouragementBreak;
  $: transcriptText = liveTranscript || answerInput || "—";
  $: candidatesText = liveCandidates.length ? liveCandidates.join(", ") : "—";
  $: feedbackMessage = describeFeedback(feedback);

  function describeFeedback(result: AnswerInterpretation | null): { tone: string; title: string; detail: string } {
    if (!result) {
      return { tone: "", title: "", detail: "" };
    }
    if (result.isCorrect) {
      return { tone: "ok", title: "Nice!", detail: `Matched (${result.matchType}).` };
    }
    if (result.matchType === "ambiguous") {
      return {
        tone: "maybe",
        title: "Almost.",
        detail: `We heard “${result.normalizedInput}”. Try again, or mark correct if that was right.`
      };
    }
    return { tone: "bad", title: "Not quite.", detail: `Accepted: ${result.normalizedAnswers.join(", ")}` };
  }

  const playSubtitle =
    deck.subject === "sight-words"
      ? `Grade ${deck.grade}`
      : deck.subject === "math" && "unitLabel" in deck && deck.unitLabel
        ? deck.unitLabel
        : deck.subject === "math"
          ? `${deck.operation.slice(0, 1).toUpperCase()}${deck.operation.slice(1)}`
          : deck.subject === "vocabulary"
            ? (deck.topic ?? "")
            : "";

  /** Typing mode: always show. Mic mode: show only when safe so kids don't speak before capture is ready. */
  $: showPromptCard =
    !encouragementBreak &&
    (!autoMic ||
      feedback?.matchType === "ambiguous" ||
      (micReady && !hidePromptForPostBreakWarmup));

  $: pauseAllowed =
    Boolean(currentCard) &&
    !encouragementBreak &&
    !sessionPaused &&
    (autoMic || !isListening);

  const canAutoAdvance = (result: AnswerInterpretation, rawInput: string): boolean => {
    void rawInput;
    return result.isCorrect;
  };

  const pushTranscriptHistory = (
    heard: string[],
    outcome: TranscriptEntry["outcome"],
    prompt: string
  ) => {
    transcriptHistory = [
      { cardPrompt: prompt, heard: heard.length > 0 ? heard : ["(empty)"], outcome },
      ...transcriptHistory
    ].slice(0, 12);
  };

  const scoreCandidatesAgainstCard = (
    candidates: string[],
    fallback: string,
    card: Card
  ): { interpretation: AnswerInterpretation | null; winningText: string } => {
    const heardList =
      candidates.length > 0 ? candidates : [fallback].filter((value) => value.trim().length > 0);

    let interpretation: AnswerInterpretation | null = null;
    let winningText = fallback;

    for (const candidate of heardList) {
      const attempt = AnswerInterpreter.interpret(candidate, card);
      if (attempt.isCorrect) {
        interpretation = attempt;
        winningText = candidate;
        break;
      }
      if (attempt.matchType === "ambiguous" && !interpretation) {
        interpretation = attempt;
      } else if (!interpretation) {
        interpretation = attempt;
      }
    }

    return { interpretation, winningText };
  };

  const pauseSession = () => {
    sessionPaused = true;
  };

  const resumeSession = () => {
    sessionPaused = false;
  };

  const triggerEncouragementBreak = () => {
    sessionPaused = false;
    encouragementMessage = encouragement[Math.floor(Math.random() * encouragement.length)];
    liveTranscript = "";
    liveCandidates = [];
    speechError = "";
    encouragementBreak = true;
    window.setTimeout(() => {
      encouragementBreak = false;
      postBreakMicCooldown = true;
      hidePromptForPostBreakWarmup = true;
      liveTranscript = "";
      liveCandidates = [];
      /* Keep mic session alive (no stop/start) — only gate prompt + scoring briefly. */
      micReady = true;
      suppressFinalScoringUntil = Date.now() + POST_BREAK_MIC_MS + POST_BREAK_PROMPT_AND_SCORE_MS;
      window.setTimeout(() => {
        postBreakMicCooldown = false;
        hidePromptForPostBreakWarmup = false;
      }, POST_BREAK_MIC_MS);
    }, ENCOURAGEMENT_BREAK_MS);
  };

  const afterCorrectAdvance = (heardList: string[], promptForHistory: string) => {
    pushTranscriptHistory(heardList, "correct", promptForHistory);
    cardsCompletedSinceBreak += 1;
    goToNextCard();

    if (
      cardsCompletedSinceBreak >= cardsBeforeBreak &&
      currentCardIndex < shuffledCards.length
    ) {
      triggerEncouragementBreak();
      cardsCompletedSinceBreak = 0;
    }
  };

  const goToNextCard = () => {
    if (currentCardIndex < shuffledCards.length - 1) {
      currentCardIndex += 1;
    } else {
      currentCardIndex = shuffledCards.length;
    }
    answerInput = "";
    liveTranscript = "";
    liveCandidates = [];
    feedback = null;
    speechError = "";
  };

  const evaluateAnswer = (rawInput: string) => {
    if (sessionPaused) {
      return;
    }
    const card = latestCard;
    if (!card || !rawInput.trim()) {
      feedback = null;
      return;
    }
    feedback = AnswerInterpreter.interpret(rawInput, card);

    if (canAutoAdvance(feedback, rawInput)) {
      afterCorrectAdvance([rawInput.trim()], card.prompt);
    }
  };

  const skipCard = () => {
    const card = latestCard;
    if (card) {
      pushTranscriptHistory([], "incorrect", card.prompt);
    }
    goToNextCard();
  };

  /** Only reachable from buttons shown while a card is up. */
  const markCorrect = () => {
    const card = latestCard as Card;
    feedback = {
      isCorrect: true,
      matchType: "exact",
      normalizedInput: answerInput.trim(),
      normalizedAnswers: card.answers
    };
    afterCorrectAdvance([answerInput.trim() || "(marked)"], card.prompt);
  };

  const retryCard = () => {
    answerInput = "";
    liveTranscript = "";
    liveCandidates = [];
    speechError = "";
    feedback = null;
  };

  /** SpeechRecognizer only reports a final segment when it heard something, so there's always a candidate to score. */
  const handleFinalSpeechSegment = (segmentPrimary: string, candidates: string[]) => {
    const card = latestCard;
    if (
      !card ||
      latestEncouragementBreak ||
      latestAmbiguous ||
      latestSessionPaused ||
      postBreakMicCooldown ||
      hidePromptForPostBreakWarmup
    ) {
      return;
    }
    if (Date.now() < suppressFinalScoringUntil) {
      return;
    }

    const { interpretation, winningText } = scoreCandidatesAgainstCard(candidates, segmentPrimary, card);
    const result = interpretation as AnswerInterpretation;
    answerInput = winningText;
    feedback = result;

    if (result.isCorrect) {
      afterCorrectAdvance(candidates, card.prompt);
      return;
    }
    pushTranscriptHistory(candidates, result.matchType === "ambiguous" ? "ambiguous" : "incorrect", card.prompt);
  };

  const trySpeechInput = async () => {
    speechError = "";
    liveTranscript = "";
    liveCandidates = [];
    isListening = true;
    micReady = false;
    try {
      answerInput = await SpeechRecognizer.listenOnce(
        "en-US",
        (transcript, candidates) => {
          liveTranscript = transcript;
          liveCandidates = candidates;
        },
        () => {
          micReady = true;
        }
      );

      const card = latestCard;
      const heardList =
        liveCandidates.length > 0 ? liveCandidates : [answerInput.trim()].filter(Boolean);

      if (!card) {
        feedback = null;
        return;
      }

      const { interpretation, winningText } = scoreCandidatesAgainstCard(
        liveCandidates,
        answerInput,
        card
      );

      answerInput = winningText;

      if (!answerInput.trim()) {
        pushTranscriptHistory(heardList, "empty", card.prompt);
      } else if (interpretation?.isCorrect) {
        feedback = interpretation;
        afterCorrectAdvance(heardList, card.prompt);
        return;
      } else if (interpretation?.matchType === "ambiguous") {
        feedback = interpretation;
        pushTranscriptHistory(heardList, "ambiguous", card.prompt);
      } else if (interpretation) {
        feedback = interpretation;
        pushTranscriptHistory(heardList, "incorrect", card.prompt);
      }
    } catch (error) {
      speechError = error instanceof Error ? error.message : "Speech input failed.";
    } finally {
      isListening = false;
      micReady = false;
    }
  };

  /** Keep recognition running through encouragement/post-break so mobile OS does not replay the “recording” sound each cycle. */
  $: wantContinuousMic =
    autoMic &&
    SpeechRecognizer.isSupported() &&
    currentCard != null &&
    !sessionPaused &&
    feedback?.matchType !== "ambiguous";

  $: if (wantContinuousMic && !SpeechRecognizer.isContinuousActive()) {
    micReady = false;
    isListening = true;
    SpeechRecognizer.startContinuous(
      {
        onTranscriptUpdate: (transcript, candidates) => {
          if (transcript.trim()) {
            speechError = "";
          }
          liveTranscript = transcript;
          liveCandidates = candidates;
        },
        onFinalSegment: (segmentPrimary, candidates) => {
          speechError = "";
          handleFinalSpeechSegment(segmentPrimary, candidates);
        },
        onReady: () => {
          micReady = true;
          if (hidePromptForPostBreakWarmup) {
            liveTranscript = "";
            liveCandidates = [];
            suppressFinalScoringUntil = Date.now() + POST_BREAK_PROMPT_AND_SCORE_MS;
            window.setTimeout(() => {
              hidePromptForPostBreakWarmup = false;
            }, POST_BREAK_PROMPT_AND_SCORE_MS);
          }
        },
        onError: (message) => {
          speechError = message;
          micReady = false;
        },
        onEnd: () => {
          /* Keep micReady true across Chrome's internal session reconnects; only explicit stop clears it. */
        }
      },
      { lang: "en-US", autoRestart: true }
    );
  }

  $: if (!wantContinuousMic && SpeechRecognizer.isContinuousActive()) {
    SpeechRecognizer.stopContinuous();
    isListening = false;
    micReady = false;
  }

  onDestroy(() => {
    SpeechRecognizer.stopContinuous();
  });

  const onInputChange = (event: Event) => {
    evaluateAnswer((event.currentTarget as HTMLInputElement).value);
  };
</script>

<section class="fc-play">
  <header class="fc-play__header">
    <button type="button" class="fc-btn fc-btn--quiet fc-play__back" on:click={() => dispatch("back")}>
      ← Home
    </button>
    <div class="fc-play__titles">
      <h2 class="fc-play__title">{title}</h2>
      <p class="fc-play__subtitle">{playSubtitle}</p>
    </div>
    {#if sessionPaused && currentCard && !encouragementBreak}
      <span class="fc-pill fc-pill--paused">Paused</span>
    {:else if autoMic}
      <span class="fc-pill fc-pill--live">Listening</span>
    {:else}
      <span class="fc-pill">Typing</span>
    {/if}
  </header>

  {#if currentCard}
    <div class="fc-play__stage">
      <div
        class="fc-pause-scrim"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fc-pause-heading"
        hidden={!showPauseScrim}
      >
        <p id="fc-pause-heading" class="fc-pause-scrim__title">Paused</p>
        <p class="fc-pause-scrim__hint">Ready when you are.</p>
        <button type="button" class="fc-btn fc-btn--primary fc-pause-scrim__go" on:click={resumeSession}>
          Go!
        </button>
      </div>

      <div class="fc-progress" aria-label="Progress through deck">
        <div class="fc-progress__track">
          <div class="fc-progress__fill" style="width: {progressPercent}%"></div>
        </div>
        <p class="fc-progress__text">{progressDisplay}</p>
      </div>

      {#if pauseAllowed}
        <div class="fc-pause-row">
          <button type="button" class="fc-btn fc-btn--quiet fc-pause-row__btn" on:click={pauseSession}>
            Pause
          </button>
        </div>
      {/if}

    <div class="fc-encourage fc-surface" role="status" hidden={!encouragementBreak}>
      <p class="fc-encourage__msg">{encouragementMessage}</p>
      <p class="fc-muted">Quick breather</p>
      <p class="fc-muted fc-muted--small">
        The microphone stays active in the background so your phone does not restart recording for each break.
      </p>
    </div>
    {#if showPromptCard}
      <FlashCard prompt={currentCard.prompt} cue={typingCue} />
    {:else if autoMic && !encouragementBreak}
      <div class="fc-warmup fc-surface">
        <div class="fc-warmup__pulse" aria-hidden="true"></div>
        <p class="fc-warmup__title">Getting microphone ready</p>
        <p class="fc-muted">
          The {promptName} will pop up when listening is on — hang tight!
        </p>
      </div>
    {/if}

    <div class="fc-panel fc-surface">
      <label class="fc-label" for="answer-input">Your answer</label>
      <input
        id="answer-input"
        class="fc-input"
        bind:value={answerInput}
        placeholder="Type or speak your answer"
        on:input={onInputChange}
        disabled={encouragementBreak || sessionPaused}
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />

      <div class="fc-actions">
        <button
          type="button"
          class="fc-btn fc-btn--ghost"
          on:click={skipCard}
          disabled={encouragementBreak || sessionPaused}
        >
          Skip
        </button>
        <button
          type="button"
          class="fc-btn fc-btn--primary"
          on:click={markCorrect}
          disabled={encouragementBreak || sessionPaused}
        >
          Mark correct
        </button>
        {#if !autoMic}
          <button
            type="button"
            class="fc-btn fc-btn--accent"
            on:click={trySpeechInput}
            disabled={!SpeechRecognizer.isSupported() || isListening || encouragementBreak || sessionPaused}
          >
            {#if isListening}
              Listening…
            {:else}
              Use microphone
            {/if}
          </button>
        {/if}
      </div>

      {#if autoMic && !encouragementBreak && !sessionPaused}
        <p class="fc-hint">
          Continuous listening — we score each phrase after a small pause.
        </p>
        {#if postBreakMicCooldown}
          <p class="fc-hint fc-hint--accent">
            Starting microphone… wait until the {promptName} appears.
          </p>
        {/if}
      {/if}

      {#if !SpeechRecognizer.isSupported()}
        <p class="fc-banner fc-banner--warn">Speech recognition isn’t available in this browser.</p>
      {/if}

      {#if isListening && !encouragementBreak && !postBreakMicCooldown && !sessionPaused}
        <div class="fc-live fc-live--on">
          <span class="fc-live__dot" aria-hidden="true"></span>
          <div>
            <p class="fc-live__status">Mic {micStatusLabel}</p>
            <p class="fc-muted fc-muted--small">
              Live: {liveTranscript || "(waiting for speech…)"}
            </p>
          </div>
        </div>
      {:else if liveTranscript && !encouragementBreak && !postBreakMicCooldown && !sessionPaused}
        <p class="fc-muted fc-muted--small">Last heard: {liveTranscript}</p>
      {/if}

      <p class="fc-banner fc-banner--error" hidden={!speechError}>{speechError}</p>

      <div class="fc-feedback fc-feedback--{feedbackMessage.tone}" hidden={!feedback}>
        <strong>{feedbackMessage.title}</strong>
        {feedbackMessage.detail}
      </div>

      <div class="fc-actions fc-actions--tight" hidden={!latestAmbiguous}>
        <button type="button" class="fc-btn fc-btn--ghost" on:click={retryCard} disabled={sessionPaused}>
          Try again
        </button>
        <button type="button" class="fc-btn fc-btn--primary" on:click={markCorrect} disabled={sessionPaused}>
          Mark correct
        </button>
        <button type="button" class="fc-btn fc-btn--ghost" on:click={skipCard} disabled={sessionPaused}>
          Skip
        </button>
      </div>
    </div>

    {#if !encouragementBreak && !sessionPaused}
      <details class="fc-details fc-surface">
        <summary>Listening details</summary>
        <div class="fc-details__grid">
          <article class="fc-mini">
            <h3 class="fc-mini__title">Transcript</h3>
            <p class="fc-mini__body">{transcriptText}</p>
            <p class="fc-muted fc-muted--small">
              Candidates: {candidatesText}
            </p>
          </article>
          <article class="fc-mini">
            <h3 class="fc-mini__title">History</h3>
            {#if transcriptHistory.length === 0}
              <p class="fc-muted">No attempts yet</p>
            {:else}
              <ul class="fc-history">
                {#each transcriptHistory as item}
                  <li class="fc-history__row">
                    <span class="fc-history__word">{item.cardPrompt}</span>
                    <span class="fc-history__heard">{item.heard.join(", ")}</span>
                    <span class={`fc-tag fc-tag--${item.outcome}`}>{item.outcome}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </article>
        </div>
      </details>
    {/if}
    </div>
  {:else}
    <div class="fc-complete fc-surface">
      <div class="fc-complete__icon" aria-hidden="true">★</div>
      <h3 class="fc-complete__title">{finishedTitle}</h3>
      <p class="fc-muted">{typingFinished}</p>
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
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-md);
    flex: 1;
    min-height: 0;
  }

  .fc-pause-scrim {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--fc-space-md);
    padding: var(--fc-space-xl);
    border-radius: var(--fc-radius-lg);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--fc-border);
    box-shadow: var(--fc-shadow-lg);
    text-align: center;
  }

  .fc-pause-scrim[hidden],
  .fc-actions[hidden] {
    display: none;
  }

  .fc-pause-scrim__title {
    margin: 0;
    font-size: clamp(1.5rem, 5vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--fc-text);
  }

  .fc-pause-scrim__hint {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fc-text-muted);
    max-width: 16rem;
    line-height: 1.45;
  }

  .fc-pause-scrim__go {
    min-width: min(100%, 14rem);
    min-height: 3.25rem;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .fc-pause-row {
    display: flex;
    justify-content: flex-end;
  }

  .fc-pause-row__btn {
    font-weight: 700;
    color: var(--fc-text-muted);
  }

  .fc-play__header {
    display: grid;
    grid-template-columns: auto 1fr auto;
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

  .fc-pill {
    justify-self: end;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: rgba(15, 23, 42, 0.06);
    color: var(--fc-text-muted);
  }

  .fc-pill--live {
    background: rgba(234, 88, 12, 0.15);
    color: #c2410c;
  }

  .fc-pill--paused {
    background: rgba(79, 70, 229, 0.14);
    color: #4338ca;
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

  .fc-muted {
    margin: 0;
    color: var(--fc-text-muted);
    font-size: 0.9375rem;
    line-height: 1.45;
  }

  .fc-muted--small {
    font-size: 0.8125rem;
    color: var(--fc-text-soft);
  }

  .fc-warmup {
    position: relative;
    padding: var(--fc-space-lg);
    text-align: center;
    overflow: hidden;
  }

  .fc-warmup__pulse {
    width: 3rem;
    height: 3rem;
    margin: 0 auto var(--fc-space-md);
    border-radius: 50%;
    background: var(--fc-primary-soft);
    animation: fc-pulse 1.4s ease-in-out infinite;
  }

  @keyframes fc-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.08);
      opacity: 0.7;
    }
  }

  .fc-warmup__title {
    margin: 0 0 var(--fc-space-xs);
    font-size: 1.0625rem;
    font-weight: 800;
    color: var(--fc-text);
  }

  .fc-panel {
    padding: var(--fc-space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-md);
  }

  .fc-label {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fc-text-soft);
  }

  .fc-input {
    width: 100%;
    min-height: var(--fc-touch-min);
    padding: 0 var(--fc-space-md);
    border-radius: var(--fc-radius-md);
    border: 2px solid var(--fc-border-strong);
    font-family: inherit;
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--fc-text);
    background: #fafafa;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      box-shadow 0.15s ease;
  }

  .fc-input:hover:not(:disabled) {
    border-color: rgba(13, 148, 136, 0.35);
  }

  .fc-input:focus {
    outline: none;
    border-color: var(--fc-primary);
    background: #fff;
    box-shadow: 0 0 0 3px var(--fc-primary-soft);
  }

  .fc-input:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .fc-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fc-space-sm);
  }

  .fc-actions--tight {
    margin-top: calc(var(--fc-space-xs) * -1);
  }

  .fc-actions .fc-btn {
    flex: 1 1 auto;
    min-width: 7.5rem;
  }

  .fc-hint {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--fc-text-soft);
    line-height: 1.45;
  }

  .fc-hint--accent {
    color: #c2410c;
    font-weight: 700;
  }

  .fc-banner {
    margin: 0;
    padding: var(--fc-space-sm) var(--fc-space-md);
    border-radius: var(--fc-radius-md);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .fc-banner--warn {
    background: var(--fc-warning-soft);
    color: var(--fc-warning);
    border: 1px solid rgba(202, 138, 4, 0.35);
  }

  .fc-banner--error {
    background: var(--fc-danger-soft);
    color: var(--fc-danger);
    border: 1px solid rgba(220, 38, 38, 0.25);
  }

  .fc-live {
    display: flex;
    align-items: flex-start;
    gap: var(--fc-space-sm);
    padding: var(--fc-space-sm) var(--fc-space-md);
    border-radius: var(--fc-radius-md);
    background: rgba(13, 148, 136, 0.08);
    border: 1px solid rgba(13, 148, 136, 0.2);
  }

  .fc-live__dot {
    width: 0.625rem;
    height: 0.625rem;
    margin-top: 0.35rem;
    border-radius: 50%;
    background: var(--fc-primary);
    flex-shrink: 0;
    animation: fc-blink 1s step-end infinite;
  }

  @keyframes fc-blink {
    50% {
      opacity: 0.35;
    }
  }

  .fc-live__status {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 800;
    color: var(--fc-primary-hover);
    text-transform: capitalize;
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

  .fc-feedback--maybe {
    background: var(--fc-warning-soft);
    color: #854d0e;
    border: 1px solid rgba(202, 138, 4, 0.35);
  }

  .fc-details {
    padding: 0 var(--fc-space-md);
    overflow: hidden;
  }

  .fc-details summary {
    cursor: pointer;
    padding: var(--fc-space-md) 0;
    font-weight: 800;
    font-size: 0.8125rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--fc-text-muted);
    list-style: none;
  }

  .fc-details summary::-webkit-details-marker {
    display: none;
  }

  .fc-details summary::after {
    content: "▾";
    float: right;
    opacity: 0.5;
  }

  .fc-details[open] summary::after {
    transform: rotate(-180deg);
  }

  .fc-details__grid {
    display: grid;
    gap: var(--fc-space-md);
    padding-bottom: var(--fc-space-md);
  }

  @media (min-width: 560px) {
    .fc-details__grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .fc-mini__title {
    margin: 0 0 var(--fc-space-xs);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fc-text-soft);
  }

  .fc-mini__body {
    margin: 0 0 var(--fc-space-xs);
    font-size: 0.9375rem;
    font-weight: 600;
    word-break: break-word;
    color: var(--fc-text);
  }

  .fc-history {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--fc-space-xs);
  }

  .fc-history__row {
    display: grid;
    grid-template-columns: minmax(3rem, 1fr) 2fr auto;
    gap: var(--fc-space-xs);
    align-items: center;
    padding: var(--fc-space-xs) 0;
    border-bottom: 1px solid var(--fc-border);
    font-size: 0.8125rem;
  }

  .fc-history__row:last-child {
    border-bottom: none;
  }

  .fc-history__word {
    font-weight: 800;
    color: var(--fc-text);
  }

  .fc-history__heard {
    color: var(--fc-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fc-tag {
    padding: 0.15rem 0.45rem;
    border-radius: var(--fc-radius-sm);
    font-size: 0.625rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    justify-self: end;
  }

  .fc-tag--correct {
    background: var(--fc-success-soft);
    color: var(--fc-success);
  }

  .fc-tag--incorrect {
    background: var(--fc-danger-soft);
    color: var(--fc-danger);
  }

  .fc-tag--ambiguous {
    background: var(--fc-warning-soft);
    color: var(--fc-warning);
  }

  .fc-tag--empty {
    background: rgba(15, 23, 42, 0.06);
    color: var(--fc-text-muted);
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

  .fc-complete__btn {
    min-width: 12rem;
  }
</style>
