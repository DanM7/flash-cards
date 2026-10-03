import { afterEach, describe, expect, it, vi } from "vitest";
import { readNav, writeNav } from "../src/nav";

const setUrl = (url: string) => history.replaceState(null, "", url);

afterEach(() => setUrl("/"));

describe("readNav", () => {
  it("reads blank values when the query string is empty", () => {
    setUrl("/");
    expect(readNav()).toEqual({ grade: "", subject: "", mode: "", unit: "" });
  });

  it("reads values and lowercases mode and unit", () => {
    setUrl("/?grade=6&subject=geography&mode=TIMED&unit=Europe-West");
    expect(readNav()).toEqual({ grade: "6", subject: "geography", mode: "timed", unit: "europe-west" });
  });
});

describe("writeNav", () => {
  it("always writes every key in order, keeping existing values", () => {
    setUrl("/?subject=math");
    writeNav({ grade: "5" }, "replace");
    expect(window.location.search).toBe("?grade=5&subject=math&mode=&unit=");
  });

  it("keeps unrelated params after ours and preserves the hash", () => {
    setUrl("/?debug=1&grade=2#top");
    writeNav({ unit: "addition" }, "replace");
    expect(window.location.search).toBe("?grade=2&subject=&mode=&unit=addition&debug=1");
    expect(window.location.hash).toBe("#top");
  });

  it("pushes a new history entry or replaces the current one", () => {
    setUrl("/?grade=&subject=&mode=&unit=");
    const push = vi.spyOn(history, "pushState");
    const replace = vi.spyOn(history, "replaceState");
    writeNav({ grade: "3" }, "push");
    expect(push).toHaveBeenCalledTimes(1);
    writeNav({ grade: "4" }, "replace");
    expect(replace).toHaveBeenCalledTimes(1);
    expect(readNav().grade).toBe("4");
  });

  it("scrolls back to the top on a push, but not on a replace", () => {
    setUrl("/?grade=&subject=&mode=&unit=");
    writeNav({ grade: "3" }, "replace");
    expect(window.scrollTo).not.toHaveBeenCalled();
    writeNav({ grade: "6" }, "push");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("skips writing when nothing would change", () => {
    setUrl("/?grade=6&subject=&mode=&unit=");
    const push = vi.spyOn(history, "pushState");
    writeNav({ grade: "6" }, "push");
    expect(push).not.toHaveBeenCalled();
  });
});
