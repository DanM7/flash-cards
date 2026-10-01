export interface Voice {
  /** BCP 47 language, e.g. "fr-FR"; picks the voice and pronunciation. */
  lang: string;
  /** 1 is normal speed. */
  rate: number;
}

export interface SpeakCallbacks {
  onStart?: () => void;
  /** Called when the speech finishes, fails, or is cut off by newer speech. */
  onEnd?: () => void;
}

/** Whether the browser can read text aloud. */
export const canSpeak = (): boolean =>
  typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";

/** Only the latest utterance reports back, so speech that was cut off can't end the newer one's animation. */
let current: SpeechSynthesisUtterance | null = null;

/** The device's voice for the language, or for the same language in another region (en-GB for en-US). */
const voiceFor = (lang: string): SpeechSynthesisVoice | undefined => {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0].toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase()) ??
    voices.find((voice) => voice.lang.split(/[-_]/)[0].toLowerCase() === base)
  );
};

/** Reads `text` aloud, stopping anything already being read. */
export function speak(text: string, settings: Voice, callbacks: SpeakCallbacks = {}): void {
  if (!canSpeak()) {
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = settings.lang;
  utterance.rate = settings.rate;
  const voice = voiceFor(settings.lang);
  if (voice) {
    utterance.voice = voice;
  }
  const ifCurrent = (callback?: () => void) => () => {
    if (current === utterance) {
      callback?.();
    }
  };
  utterance.onstart = ifCurrent(callbacks.onStart);
  utterance.onend = ifCurrent(callbacks.onEnd);
  utterance.onerror = ifCurrent(callbacks.onEnd);
  current = utterance;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak()) {
    window.speechSynthesis.cancel();
  }
}
