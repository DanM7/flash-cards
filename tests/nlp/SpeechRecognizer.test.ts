import { afterEach, describe, expect, it, vi } from "vitest";
import { SpeechRecognizer } from "../../src/nlp/SpeechRecognizer";
import { FakeRecognition, installSpeech, uninstallSpeech } from "../helpers/speech";

afterEach(() => {
  SpeechRecognizer.stopContinuous();
  uninstallSpeech();
  vi.useRealTimers();
});

describe("SpeechRecognizer.isSupported", () => {
  it("detects the standard and webkit-prefixed APIs", () => {
    expect(SpeechRecognizer.isSupported()).toBe(false);
    installSpeech("webkitSpeechRecognition");
    expect(SpeechRecognizer.isSupported()).toBe(true);
    uninstallSpeech();
    installSpeech("SpeechRecognition");
    expect(SpeechRecognizer.isSupported()).toBe(true);
  });
});

describe("SpeechRecognizer.startContinuous", () => {
  it("reports when speech recognition is missing", () => {
    const onError = vi.fn();
    SpeechRecognizer.startContinuous({ onError });
    expect(onError).toHaveBeenCalledWith("Speech recognition is not supported in this browser.");
    expect(SpeechRecognizer.isContinuousActive()).toBe(false);
    SpeechRecognizer.startContinuous({});
  });

  it("configures and starts a continuous recognizer", () => {
    installSpeech("webkitSpeechRecognition");
    const onReady = vi.fn();
    SpeechRecognizer.startContinuous({ onReady }, { lang: "fr-FR" });
    const recognizer = FakeRecognition.latest;
    expect(recognizer).toMatchObject({ lang: "fr-FR", continuous: true, interimResults: true, maxAlternatives: 5, started: 1 });
    expect(SpeechRecognizer.isContinuousActive()).toBe(true);
    recognizer.emitStart();
    expect(onReady).toHaveBeenCalled();
  });

  it("reports live transcripts and each final segment's candidates", () => {
    installSpeech();
    const onTranscriptUpdate = vi.fn();
    const onFinalSegment = vi.fn();
    SpeechRecognizer.startContinuous({ onTranscriptUpdate, onFinalSegment });
    const recognizer = FakeRecognition.latest;

    recognizer.emitEmptyResult();
    expect(onTranscriptUpdate).not.toHaveBeenCalled();

    recognizer.emitResult(
      [
        { transcripts: ["hello", " yellow "], isFinal: true },
        undefined,
        { transcripts: [undefined, " ", "world"], isFinal: false },
        { transcripts: [undefined, "", "cat"], isFinal: true },
        { transcripts: [" "], isFinal: true }
      ],
      0
    );
    expect(onTranscriptUpdate).toHaveBeenCalledWith("hello world cat", ["hello", "yellow", "world", "cat"]);
    expect(onFinalSegment.mock.calls).toEqual([
      ["hello", ["hello", "yellow"]],
      ["cat", ["cat"]]
    ]);

    onFinalSegment.mockClear();
    recognizer.emitResult([{ transcripts: ["one"], isFinal: true }, { transcripts: ["two"], isFinal: true }]);
    expect(onFinalSegment).toHaveBeenCalledTimes(2);

    onFinalSegment.mockClear();
    recognizer.emitResult([{ transcripts: ["one"], isFinal: true }, { transcripts: ["two"], isFinal: true }], 1);
    expect(onFinalSegment.mock.calls).toEqual([["two", ["two"]]]);
  });

  it("works without any callbacks", () => {
    installSpeech();
    SpeechRecognizer.startContinuous({}, { autoRestart: false });
    const recognizer = FakeRecognition.latest;
    recognizer.emitStart();
    recognizer.emitResult([{ transcripts: ["hi"], isFinal: true }]);
    recognizer.emitError("network");
    recognizer.emitEnd();
    expect(SpeechRecognizer.isContinuousActive()).toBe(false);
  });

  it("turns error codes into friendly messages and ignores benign ones", () => {
    installSpeech();
    const onError = vi.fn();
    SpeechRecognizer.startContinuous({ onError });
    const recognizer = FakeRecognition.latest;
    recognizer.emitError("no-speech");
    recognizer.emitError("aborted");
    expect(onError).not.toHaveBeenCalled();

    const cases: [string | undefined, string][] = [
      ["not-allowed", "Microphone permission denied."],
      ["audio-capture", "No microphone found."],
      ["network", "Speech recognition lost connection. Check your network and try again."],
      ["service-not-allowed", "Speech recognition isn’t available."],
      ["bad-grammar", "Speech recognition configuration error."],
      ["language-not-supported", "Speech recognition configuration error."],
      ["weird", "Speech recognition error (weird)."],
      [undefined, "Speech recognition error."]
    ];
    for (const [code, message] of cases) {
      recognizer.emitError(code);
      expect(onError).toHaveBeenLastCalledWith(message);
    }
  });

  it("restarts after the session ends when auto-restart is on", () => {
    vi.useFakeTimers();
    installSpeech();
    const onEnd = vi.fn();
    SpeechRecognizer.startContinuous({ onEnd });
    const recognizer = FakeRecognition.latest;
    recognizer.emitEnd();
    expect(onEnd).toHaveBeenCalled();
    vi.runAllTimers();
    expect(recognizer.started).toBe(2);
    expect(SpeechRecognizer.isContinuousActive()).toBe(true);
  });

  it("gives up on restarting if start throws", () => {
    vi.useFakeTimers();
    installSpeech();
    SpeechRecognizer.startContinuous({});
    const recognizer = FakeRecognition.latest;
    recognizer.emitEnd();
    FakeRecognition.failStart = true;
    vi.runAllTimers();
    expect(SpeechRecognizer.isContinuousActive()).toBe(false);
  });

  it("skips the deferred restart if listening was stopped or replaced", () => {
    vi.useFakeTimers();
    installSpeech();
    SpeechRecognizer.startContinuous({});
    const first = FakeRecognition.latest;
    first.emitEnd();
    SpeechRecognizer.stopContinuous(false);
    vi.runAllTimers();
    expect(first.started).toBe(1);

    SpeechRecognizer.startContinuous({});
    const second = FakeRecognition.latest;
    second.emitEnd();
    SpeechRecognizer.stopContinuous();
    vi.runAllTimers();
    expect(second.started).toBe(1);
  });

  it("does not restart a recognizer that is no longer current", () => {
    installSpeech();
    SpeechRecognizer.startContinuous({});
    const first = FakeRecognition.latest;
    SpeechRecognizer.startContinuous({});
    first.emitEnd();
    expect(SpeechRecognizer.isContinuousActive()).toBe(false);
  });

  it("reports when listening cannot start", () => {
    installSpeech();
    FakeRecognition.failStart = true;
    const onError = vi.fn();
    SpeechRecognizer.startContinuous({ onError });
    expect(onError).toHaveBeenCalledWith("Unable to start continuous listening.");
    expect(SpeechRecognizer.isContinuousActive()).toBe(false);
    SpeechRecognizer.startContinuous({});
  });
});

describe("SpeechRecognizer.stopContinuous", () => {
  it("does nothing when idle", () => {
    expect(() => SpeechRecognizer.stopContinuous()).not.toThrow();
  });

  it("stops, falling back to abort, and swallows errors from both", () => {
    installSpeech();
    SpeechRecognizer.startContinuous({});
    const recognizer = FakeRecognition.latest;
    SpeechRecognizer.stopContinuous();
    expect(recognizer.stopped).toBe(1);

    SpeechRecognizer.startContinuous({});
    FakeRecognition.failStop = true;
    SpeechRecognizer.stopContinuous();
    expect(FakeRecognition.latest.aborted).toBe(1);

    SpeechRecognizer.startContinuous({});
    FakeRecognition.failAbort = true;
    expect(() => SpeechRecognizer.stopContinuous()).not.toThrow();
  });
});

describe("SpeechRecognizer.listenOnce", () => {
  it("rejects when speech recognition is missing", async () => {
    await expect(SpeechRecognizer.listenOnce()).rejects.toThrow("Speech recognition is not supported in this browser.");
  });

  it("resolves with the combined transcript when listening ends", async () => {
    installSpeech();
    const onUpdate = vi.fn();
    const onReady = vi.fn();
    const promise = SpeechRecognizer.listenOnce("es-ES", onUpdate, onReady);
    const recognizer = FakeRecognition.latest;
    expect(recognizer).toMatchObject({ lang: "es-ES", continuous: false, started: 1 });

    recognizer.emitStart();
    recognizer.emitEmptyResult();
    recognizer.emitResult([{ transcripts: ["seven", " 7 ", ""] }, undefined, { transcripts: [undefined] }]);
    recognizer.emitEnd();
    recognizer.emitEnd();

    await expect(promise).resolves.toBe("seven");
    expect(onReady).toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith("seven", ["seven", "7"]);
  });

  it("works without callbacks", async () => {
    installSpeech();
    const promise = SpeechRecognizer.listenOnce();
    const recognizer = FakeRecognition.latest;
    recognizer.emitStart();
    recognizer.emitResult([{ transcripts: ["hi"] }]);
    recognizer.emitEnd();
    await expect(promise).resolves.toBe("hi");
  });

  it("ignores benign errors and rejects on real ones", async () => {
    installSpeech();
    const promise = SpeechRecognizer.listenOnce();
    const recognizer = FakeRecognition.latest;
    recognizer.emitError("no-speech");
    recognizer.emitError("not-allowed");
    recognizer.emitEnd();
    await expect(promise).rejects.toThrow("Microphone permission denied.");
  });
});
