import { vi } from "vitest";

/** Manual requestAnimationFrame: queued callbacks only run when a test calls `flush(now)`. */
export const installFrames = () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextId;
    nextId += 1;
    frames.set(id, callback);
    return id;
  });
  const cancel = vi.fn((id: number) => {
    frames.delete(id);
  });
  vi.stubGlobal("cancelAnimationFrame", cancel);
  vi.spyOn(performance, "now").mockReturnValue(0);
  return {
    cancel,
    pending: () => frames.size,
    flush: (now: number) => {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(now));
    }
  };
};

export const setReducedMotion = (reduce: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: reduce && query.includes("reduce"), media: query }))
  );
};
