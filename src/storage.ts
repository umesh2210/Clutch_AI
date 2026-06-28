import type { AppState } from "./types";
import { initialState } from "./seed";

const KEY = "clutchai-state-v2";
const OLD_KEY = "clutchai-state-v1";

export function loadState(): AppState {
  try {
    let stored = localStorage.getItem(KEY);
    let migrating = false;
    if (!stored) {
      stored = localStorage.getItem(OLD_KEY);
      migrating = true;
    }
    if (!stored) return initialState();
    const parsed = JSON.parse(stored);
    const defaults = initialState();
    
    const profile = {
      ...defaults.profile,
      ...(parsed.profile || {}),
    };
    if (profile.weeklyHolidays === undefined) profile.weeklyHolidays = [0];
    if (profile.holidayMode === undefined) profile.holidayMode = "rest";
    if (profile.productivityPeak === undefined) profile.productivityPeak = profile.focusPreference || "morning";

    const routineBlocks = parsed.routineBlocks ?? [];
    const calendarEvents = parsed.calendarEvents ?? [];

    const state: AppState = {
      ...defaults,
      ...parsed,
      profile,
      routineBlocks,
      calendarEvents,
      streakHistory: (parsed.streakHistory ?? defaults.streakHistory).map((day: any) => ({
        ...day,
        completed: Math.max(0, day.completed),
      })),
      chatSessions: parsed.chatSessions ?? defaults.chatSessions,
    };

    if (migrating) {
      saveState(state);
      try {
        localStorage.removeItem(OLD_KEY);
      } catch (e) {
        console.warn("Could not remove old state key", e);
      }
    }
    return state;
  } catch {
    return initialState();
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
