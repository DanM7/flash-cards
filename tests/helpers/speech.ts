type ResultEvent = {
  results?: { length: number; [index: number]: unknown };
  resultIndex?: number;
};

/** Stand-in for the browser's SpeechRecognition, recording every instance so tests can drive it. */
export class FakeRecognition {
  static instances: FakeRecognition[] = [];
  static failStart = false;
  static failStop = false;
  static failAbort = false;

  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: ResultEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  started = 0;
  stopped = 0;
  aborted = 0;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  static reset() {
    FakeRecognition.instances = [];
    FakeRecognition.failStart = false;
    FakeRecognition.failStop = false;
    FakeRecognition.failAbort = false;
  }

  static get latest(): FakeRecognition {
    return FakeRecognition.instances[FakeRecognition.instances.length - 1];
  }

  start() {
    if (FakeRecognition.failStart) {
      throw new Error("start failed");
    }
    this.started += 1;
  }

  stop() {
    this.stopped += 1;
    if (FakeRecognition.failStop) {
      throw new Error("stop failed");
    }
  }

  abort() {
    this.aborted += 1;
    if (FakeRecognition.failAbort) {
      throw new Error("abort failed");
    }
  }

  emitStart() {
    this.onstart?.();
  }

  emitEnd() {
    this.onend?.();
  }

  emitError(error?: string) {
    this.onerror?.(Object.assign(new Event("error"), error === undefined ? {} : { error }));
  }

  /** Each inner array is one result block of alternative transcripts. */
  emitResult(blocks: ({ transcripts: (string | undefined)[]; isFinal?: boolean } | undefined)[], resultIndex?: number) {
    const results: Record<number, unknown> & { length: number } = { length: blocks.length };
    blocks.forEach((block, i) => {
      if (!block) {
        results[i] = undefined;
        return;
      }
      const alternatives: Record<number, unknown> & { length: number; isFinal?: boolean } = {
        length: block.transcripts.length,
        isFinal: block.isFinal
      };
      block.transcripts.forEach((transcript, j) => {
        alternatives[j] = transcript === undefined ? undefined : { transcript };
      });
      results[i] = alternatives;
    });
    this.onresult?.({ results, resultIndex });
  }

  emitEmptyResult() {
    this.onresult?.({});
  }
}

type SpeechWindow = Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };

export const installSpeech = (key: "SpeechRecognition" | "webkitSpeechRecognition" = "SpeechRecognition") => {
  FakeRecognition.reset();
  (window as SpeechWindow)[key] = FakeRecognition;
};

export const uninstallSpeech = () => {
  delete (window as SpeechWindow).SpeechRecognition;
  delete (window as SpeechWindow).webkitSpeechRecognition;
  FakeRecognition.reset();
};
