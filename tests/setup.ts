import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { setReducedMotion } from "./helpers/animation";

// jsdom has <dialog> but not its methods; these cover what the app uses.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};

beforeEach(() => {
  // jsdom has no matchMedia; default to a browser that allows motion.
  setReducedMotion(false);
  // jsdom doesn't implement scrolling.
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  history.replaceState(null, "", "/");
  localStorage.clear();
});
