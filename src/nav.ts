/** Query string keys, written in this order and always present (blank when unset). */
const NAV_KEYS = ["grade", "subject", "mode", "unit"] as const;

export type NavKey = (typeof NAV_KEYS)[number];
export type NavState = Record<NavKey, string>;

/** Multiple-choice decks use practice/timed; voice decks use typing/microphone. */
export type PlayMode = "practice" | "timed" | "typing" | "microphone";

export const readNav = (): NavState => {
  const params = new URLSearchParams(window.location.search);
  return {
    grade: params.get("grade") ?? "",
    subject: params.get("subject") ?? "",
    mode: (params.get("mode") ?? "").toLowerCase(),
    unit: (params.get("unit") ?? "").toLowerCase()
  };
};

/** Updates the given keys, keeps the rest, and leaves any unrelated params after ours. */
export const writeNav = (changes: Partial<NavState>, how: "push" | "replace") => {
  const current = new URLSearchParams(window.location.search);
  const next = new URLSearchParams();
  for (const key of NAV_KEYS) {
    next.set(key, changes[key] ?? current.get(key) ?? "");
  }
  current.forEach((value, key) => {
    if (!(NAV_KEYS as readonly string[]).includes(key)) {
      next.append(key, value);
    }
  });
  const url = `${window.location.pathname}?${next}${window.location.hash}`;
  if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    return;
  }
  if (how === "push") {
    history.pushState(null, "", url);
  } else {
    history.replaceState(null, "", url);
  }
};
