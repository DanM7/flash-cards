type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((
        event: {
          results?: SpeechRecognitionResultListLike;
          resultIndex?: number;
        }
      ) => void)
    | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultLike = {
  isFinal?: boolean;
  length: number;
  [index: number]: { transcript?: string } | undefined;
};

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike | undefined;
};

type BrowserSpeechRecognition = new () => RecognitionInstance;

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: BrowserSpeechRecognition;
  webkitSpeechRecognition?: BrowserSpeechRecognition;
}

/** Chromium fires these often during continuous listening; they are not user-facing failures. */
function isBenignSpeechRecognitionError(code: string): boolean {
  return code === "no-speech" || code === "aborted";
}

function recognitionErrorMessage(event: Event): string | null {
  // A plain string: older browsers still send codes like "bad-grammar" that TypeScript's DOM types have dropped.
  const { error } = event as Event & { error?: unknown };
  const code = typeof error === "string" ? error : "";

  if (isBenignSpeechRecognitionError(code)) {
    return null;
  }

  switch (code) {
    case "not-allowed":
      return "Microphone permission denied.";
    case "audio-capture":
      return "No microphone found.";
    case "network":
      return "Speech recognition lost connection. Check your network and try again.";
    case "service-not-allowed":
      return "Speech recognition isn’t available.";
    case "bad-grammar":
    case "language-not-supported":
      return "Speech recognition configuration error.";
    default:
      return code ? `Speech recognition error (${code}).` : "Speech recognition error.";
  }
}

export interface ContinuousSpeechCallbacks {
  onTranscriptUpdate?: (transcript: string, candidates: string[]) => void;
  onFinalSegment?: (transcript: string, candidates: string[]) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

export interface ContinuousSpeechOptions {
  lang?: string;
  autoRestart?: boolean;
}

export class SpeechRecognizer {
  private static continuousRecognizer: RecognitionInstance | null = null;
  private static continuousShouldRestart = false;

  static isSupported(): boolean {
    const speechWindow = window as SpeechRecognitionWindow;
    return Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
  }

  static startContinuous(callbacks: ContinuousSpeechCallbacks, options: ContinuousSpeechOptions = {}): void {
    const { lang = "en-US", autoRestart = true } = options;
    this.stopContinuous(false);

    const speechWindow = window as SpeechRecognitionWindow;
    const RecognitionClass =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!RecognitionClass) {
      callbacks.onError?.("Speech recognition is not supported in this browser.");
      return;
    }

    this.continuousShouldRestart = autoRestart;
    const recognizer = new RecognitionClass();
    recognizer.lang = lang;
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 5;

    recognizer.onstart = () => {
      callbacks.onReady?.();
    };

    recognizer.onresult = (event) => {
      const results = event.results;
      if (!results) {
        return;
      }

      let fullCombined = "";
      const liveCandidates = new Set<string>();

      for (let i = 0; i < results.length; i += 1) {
        const block = results[i];
        if (!block) {
          continue;
        }

        let best = "";
        for (let j = 0; j < block.length; j += 1) {
          const t = (block[j]?.transcript ?? "").trim();
          if (t) {
            liveCandidates.add(t);
            if (!best) {
              best = t;
            }
          }
        }

        fullCombined = `${fullCombined} ${best}`.trim();
      }

      callbacks.onTranscriptUpdate?.(fullCombined.trim(), Array.from(liveCandidates));

      const startIndex = typeof event.resultIndex === "number" ? event.resultIndex : 0;
      for (let i = startIndex; i < results.length; i += 1) {
        const block = results[i];
        if (!block?.isFinal) {
          continue;
        }

        const segmentCandidates = new Set<string>();
        let segmentPrimary = "";
        for (let j = 0; j < block.length; j += 1) {
          const t = (block[j]?.transcript ?? "").trim();
          if (t) {
            segmentCandidates.add(t);
            if (!segmentPrimary) {
              segmentPrimary = t;
            }
          }
        }

        if (segmentPrimary || segmentCandidates.size > 0) {
          callbacks.onFinalSegment?.(segmentPrimary, Array.from(segmentCandidates));
        }
      }
    };

    recognizer.onerror = (event: Event) => {
      const message = recognitionErrorMessage(event);
      if (message) {
        callbacks.onError?.(message);
      }
    };

    recognizer.onend = () => {
      callbacks.onEnd?.();
      if (this.continuousShouldRestart && this.continuousRecognizer === recognizer) {
        // Restarting synchronously from onend often skips onstart in Chromium; defer fixes mic "ready" state.
        window.setTimeout(() => {
          if (!this.continuousShouldRestart || this.continuousRecognizer !== recognizer) {
            return;
          }
          try {
            recognizer.start();
          } catch {
            this.continuousRecognizer = null;
          }
        }, 0);
      } else {
        this.continuousRecognizer = null;
      }
    };

    this.continuousRecognizer = recognizer;
    try {
      recognizer.start();
    } catch {
      this.continuousRecognizer = null;
      callbacks.onError?.("Unable to start continuous listening.");
    }
  }

  static stopContinuous(clearRestartFlag = true): void {
    if (clearRestartFlag) {
      this.continuousShouldRestart = false;
    }
    const r = this.continuousRecognizer;
    this.continuousRecognizer = null;
    if (r) {
      try {
        r.stop();
      } catch {
        try {
          r.abort();
        } catch {
          /* ignore */
        }
      }
    }
  }

  static isContinuousActive(): boolean {
    return this.continuousRecognizer !== null;
  }

  static async listenOnce(
    lang = "en-US",
    onTranscriptUpdate?: (transcript: string, candidates: string[]) => void,
    onReady?: () => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const speechWindow = window as SpeechRecognitionWindow;
      const RecognitionClass =
        speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

      if (!RecognitionClass) {
        reject(new Error("Speech recognition is not supported in this browser."));
        return;
      }

      const recognizer = new RecognitionClass();
      recognizer.lang = lang;
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.maxAlternatives = 5;
      let finalTranscript = "";
      let hasResolved = false;

      recognizer.onresult = (event) => {
        if (!event.results) {
          return;
        }

        let combined = "";
        const candidates = new Set<string>();
        for (let i = 0; i < event.results.length; i += 1) {
          const value = event.results[i]?.[0]?.transcript ?? "";
          combined = `${combined} ${value}`.trim();

          const alternatives = event.results[i];
          if (alternatives) {
            for (let j = 0; j < alternatives.length; j += 1) {
              const candidate = (alternatives[j]?.transcript ?? "").trim();
              if (candidate) {
                candidates.add(candidate);
              }
            }
          }
        }

        onTranscriptUpdate?.(combined, Array.from(candidates));
        finalTranscript = combined;
      };
      recognizer.onstart = () => {
        onReady?.();
      };

      recognizer.onerror = (event: Event) => {
        const message = recognitionErrorMessage(event);
        if (!message) {
          return;
        }
        hasResolved = true;
        reject(new Error(message));
      };

      recognizer.onend = () => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(finalTranscript);
        }
      };

      recognizer.start();
    });
  }
}
