import type { FlashcardData } from "../data/CardTypes";

/** Served by the dev server from the flash-cards-data repo checked out next to this one. */
const LOCAL_URL = "/flashcards.json";

/** Deployed builds read the data repo on GitHub, so data changes don't need a new deploy. */
export const REMOTE_URL = "https://raw.githubusercontent.com/DanM7/flash-cards-data/main/flashcards.json";

export const flashcardsUrl = (dev: boolean): string => (dev ? LOCAL_URL : REMOTE_URL);

/** Checked in order, so a missing group is reported before anything inside it. */
const SECTIONS = [
  "appSettings",
  "appSettings.home",
  "appSettings.multipleChoice",
  "appSettings.typingAndVoice",
  "appSettings.playText",
  "catalog",
  "catalog.subjects",
  "subjectData",
  "subjectData.math",
  "subjectData.reading",
  "subjectData.french",
  "subjectData.geography"
] as const;

const LISTS = ["catalog.grades"] as const;

const valueAt = (json: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | null | undefined)?.[key], json);

/** Loads flashcards.json: app settings and wording, the grade and subject catalog, and each subject's content. */
export async function loadFlashcards(): Promise<FlashcardData> {
  const response = await fetch(flashcardsUrl(import.meta.env.DEV));
  if (!response.ok) {
    throw new Error(`Couldn't load flashcards (HTTP ${response.status}).`);
  }
  const json: unknown = await response.json();
  for (const path of SECTIONS) {
    const value = valueAt(json, path);
    if (typeof value !== "object" || value === null) {
      throw new Error(`The flashcards file has no "${path}" section.`);
    }
  }
  const language = valueAt(json, "appSettings.language");
  if (typeof language !== "string" || !language) {
    throw new Error('The flashcards file has no "appSettings.language" setting.');
  }
  for (const path of LISTS) {
    if (!Array.isArray(valueAt(json, path))) {
      throw new Error(`The flashcards file has no "${path}" list.`);
    }
  }
  return json as FlashcardData;
}
