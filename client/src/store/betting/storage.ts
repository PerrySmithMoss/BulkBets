import { BettingState } from "@/types/betting";
import { STORAGE_KEY } from "./constants";

export const loadState = (): BettingState | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (!serializedState) return undefined;

    const state = JSON.parse(serializedState);
    return state;
  } catch (err) {
    console.error("Error loading state:", err);
    return undefined;
  }
};

export const saveState = (state: BettingState) => {
  if (typeof window === "undefined") return;

  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Error saving state:", err);
  }
};
