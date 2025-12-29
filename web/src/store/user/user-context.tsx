"use client";

import { User } from "@/types/api/user/user";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useBetActions } from "../betting";
import { fetchCurrentUser } from "@/lib/api/users/fetch-current-user";

const UserContext = createContext<
  | {
      user: User["data"] | null;
      setUser: Dispatch<SetStateAction<User["data"] | null>>;
      refreshUser: () => Promise<void>;
    }
  | undefined
>(undefined);

export function UserProvider({
  initialUser,
  children,
}: Readonly<{
  initialUser: User["data"] | null;
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<User["data"] | null>(initialUser);
  const { clearAllBets } = useBetActions();

  const refreshUser = useCallback(async () => {
    const { data: updatedUser } = await fetchCurrentUser();
    setUser(updatedUser);
  }, []);

  useEffect(() => {
    if (!user) {
      // Reset bet slip if user logs  out
      clearAllBets();
    }
  }, [user, clearAllBets]);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser }}>
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
