"use client";

import { User } from "@/types/api/user/user";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";
import { fetchCurrentUser } from "@/lib/api/users/fetch-current-user";

import { demoRequest } from "@/lib/api/demo";

const UserContext = createContext<
  | {
      user: User["data"] | null;
      setUser: Dispatch<SetStateAction<User["data"] | null>>;
      refreshUser: () => Promise<void>;
      startDemo: () => Promise<void>;
      startingDemo: boolean;
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

  const [startingDemo, setStartingDemo] = useState(false);
  const startDemo = useCallback(async () => {
    setStartingDemo(true);
    try {
      setUser(await demoRequest<User["data"]>("start"));
    } finally {
      setStartingDemo(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: updatedUser } = await fetchCurrentUser();
    setUser(updatedUser);
  }, []);

  // Preserve a guest's selection across reloads and temporary account-service failures.
  // Explicit logout clears the slip in NavBar.

  return (
    <UserContext.Provider
      value={{ user, setUser, refreshUser, startDemo, startingDemo }}
    >
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
