import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { setReducedMotion } from "./helpers/animation";

beforeEach(() => {
  // jsdom has no matchMedia; default to a browser that allows motion.
  setReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  history.replaceState(null, "", "/");
});
