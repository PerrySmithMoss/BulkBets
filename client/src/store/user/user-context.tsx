"use client";

import { User } from "@/types/api/user/user";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useBetActions } from "../betting";

const UserContext = createContext<
  | { user: User | null; setUser: Dispatch<SetStateAction<User | null>> }
  | undefined
>(undefined);

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const { clearAllBets } = useBetActions();

  useEffect(() => {
    if (!user) {
      // Reset bet slip if user logs  out
      clearAllBets();
    }
  }, [user, clearAllBets]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserContext");
  }

  return context;
}
