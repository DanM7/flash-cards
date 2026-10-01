import type { FlashcardData } from "../data/CardTypes";

const LOCAL_URL = "/src/data/flashcards.json";

/** Deployed builds don't include src/, so they read the file from GitHub. */
export const REMOTE_URL = "https://raw.githubusercontent.com/DanM7/flash-cards/main/src/data/flashcards.json";

export const flashcardsUrl = (dev: boolean): string => (dev ? LOCAL_URL : REMOTE_URL);

const LISTS = ["cards", "grades"] as const;

const SECTIONS = [
  "home",
  "subjects",
  "multipleChoice",
  "typingAndVoice",
  "geography",
  "playText",
  "mathRules"
] as const;

/** Loads flashcards.json: the deck catalog, written cards, play settings and wording, and math rules. */
export async function loadFlashcards(): Promise<FlashcardData> {
  const response = await fetch(flashcardsUrl(import.meta.env.DEV));
  if (!response.ok) {
    throw new Error(`Couldn't load flashcards (HTTP ${response.status}).`);
  }
  const json = (await response.json()) as Partial<FlashcardData>;
  if (typeof json.language !== "string" || !json.language) {
    throw new Error('The flashcards file has no "language" setting.');
  }
  for (const key of LISTS) {
    if (!Array.isArray(json[key])) {
      throw new Error(`The flashcards file has no "${key}" list.`);
    }
  }
  for (const key of SECTIONS) {
    if (typeof json[key] !== "object" || json[key] === null) {
      throw new Error(`The flashcards file has no "${key}" section.`);
    }
  }
  return json as FlashcardData;
}
