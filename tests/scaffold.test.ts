import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import EncouragementOverlay from "../src/components/EncouragementOverlay.svelte";
import GradeSelector from "../src/components/GradeSelector.svelte";
import MicButton from "../src/components/MicButton.svelte";
import ProfileSelector from "../src/components/ProfileSelector.svelte";
import ProgressBar from "../src/components/ProgressBar.svelte";
import FlashcardMode from "../src/modes/flashcards/FlashcardMode.svelte";
import VoiceMode from "../src/modes/voice-only/VoiceMode.svelte";
import { ProfileModel } from "../src/profiles/ProfileModel";
import { ProfileStore } from "../src/profiles/ProfileStore";
import { AccuracyTracker } from "../src/progress/AccuracyTracker";
import { ProgressModel } from "../src/progress/ProgressModel";
import { ProgressStore } from "../src/progress/ProgressStore";
import { StreakTracker } from "../src/progress/StreakTracker";
import { TimeTracker } from "../src/progress/TimeTracker";
import SelectGrade from "../src/routes/select-grade.svelte";
import SelectProfile from "../src/routes/select-profile.svelte";
import Stats from "../src/routes/stats.svelte";

/*
 * Placeholders from the original scaffold that aren't wired into the app yet. These tests only
 * confirm they still load; replace them with real tests once each piece is built.
 */
describe("scaffold placeholders", () => {
  it.each([
    ["EncouragementOverlay", EncouragementOverlay],
    ["GradeSelector", GradeSelector],
    ["MicButton", MicButton],
    ["ProfileSelector", ProfileSelector],
    ["ProgressBar", ProgressBar],
    ["FlashcardMode", FlashcardMode],
    ["VoiceMode", VoiceMode],
    ["select-grade", SelectGrade],
    ["select-profile", SelectProfile],
    ["stats", Stats]
  ])("%s renders", (_name, component) => {
    expect(() => render(component)).not.toThrow();
  });

  it.each([ProfileModel, ProfileStore, AccuracyTracker, ProgressModel, ProgressStore, StreakTracker, TimeTracker])(
    "%o can be created",
    (Model) => {
      expect(new Model()).toBeInstanceOf(Model);
    }
  );
});
