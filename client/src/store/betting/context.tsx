"use client";

import {
  BettingAction,
  BettingActionType,
  BettingState,
} from "@/types/betting";
import {
  createContext,
  useContext,
  ReactNode,
  useReducer,
  useEffect,
} from "react";
import {
  bettingReducer,
  createPersistedReducer,
  initialState,
} from "./reducer";
import { loadState } from "./storage";
import { STORAGE_KEY } from "./constants";

const BetContext = createContext<
  { state: BettingState; dispatch: React.Dispatch<BettingAction> } | undefined
>(undefined);

interface BetProviderProps {
  children: ReactNode;
}

export const BetProvider = ({ children }: BetProviderProps) => {
  const persistedReducer = createPersistedReducer(bettingReducer);
  const [state, dispatch] = useReducer(
    persistedReducer,
    loadState() || initialState
  );

  // Sync state across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          dispatch({ type: BettingActionType.SyncState, payload: newState });
        } catch (err) {
          console.error("Error parsing storage change:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <BetContext.Provider value={{ state, dispatch }}>
      {children}
    </BetContext.Provider>
  );
};

export const useBet = () => {
  const context = useContext(BetContext);
  if (!context) {
    throw new Error("useBet must be used within a BetProvider");
  }

  return context;
};
