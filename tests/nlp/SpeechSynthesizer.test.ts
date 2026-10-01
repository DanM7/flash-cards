import { describe, expect, it, vi } from "vitest";
import { canSpeak, speak, stopSpeaking } from "../../src/nlp/SpeechSynthesizer";
import { installSynthesis } from "../helpers/speech";

const settings = { lang: "en-US", rate: 0.85 };

describe("SpeechSynthesizer", () => {
  it("does nothing when the browser can't read aloud", () => {
    expect(canSpeak()).toBe(false);
    expect(() => speak("hello", settings)).not.toThrow();
    expect(() => stopSpeaking()).not.toThrow();
  });

  it("reads text with the language, speed, and matching voice", () => {
    const synth = installSynthesis([
      { lang: "fr-FR", name: "French" },
      { lang: "en-GB", name: "British" },
      { lang: "en-US", name: "American" }
    ]);
    expect(canSpeak()).toBe(true);
    speak("ancient", settings);
    expect(synth.cancelled).toBe(1);
    expect(synth.latest).toMatchObject({ text: "ancient", lang: "en-US", rate: 0.85, voice: { name: "American" } });
  });

  it("falls back to the same language from another region, then to the default voice", () => {
    const synth = installSynthesis([{ lang: "en_GB", name: "British" }]);
    speak("vast", settings);
    expect(synth.latest.voice?.name).toBe("British");
    speak("vast", { lang: "es-MX", rate: 1 });
    expect(synth.latest.voice).toBeNull();
  });

  it("only reports back for the newest speech", () => {
    const synth = installSynthesis();
    const first = { onStart: vi.fn(), onEnd: vi.fn() };
    const second = { onStart: vi.fn(), onEnd: vi.fn() };
    speak("brave", settings, first);
    const brave = synth.latest;
    brave.onstart?.();
    expect(first.onStart).toHaveBeenCalled();

    speak("timid", settings, second);
    brave.onerror?.();
    brave.onend?.();
    expect(first.onEnd).not.toHaveBeenCalled();

    synth.latest.onstart?.();
    synth.latest.onerror?.();
    synth.latest.onend?.();
    expect(second.onStart).toHaveBeenCalledTimes(1);
    expect(second.onEnd).toHaveBeenCalledTimes(2);

    // Without callbacks, the events are simply ignored.
    speak("rapid", settings);
    expect(() => synth.latest.onend?.()).not.toThrow();
  });

  it("stops reading", () => {
    const synth = installSynthesis();
    stopSpeaking();
    expect(synth.cancelled).toBe(1);
  });
});
