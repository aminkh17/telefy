"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, signOut } from "@/app/actions/auth";

interface TelegramUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface TelegramContextType {
  user: TelegramUser | null;
  isLoading: boolean;
  logOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  isLoading: true,
  logOut: async () => {},
  refreshUser: async () => {},
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const me = await getMe();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUser(me as any);
    } catch (error) {
      console.error("Failed to fetch user", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logOut = async () => {
      await signOut();
      setUser(null);
      window.location.reload(); 
  };
  
  return (
    <TelegramContext.Provider value={{ user, isLoading, logOut, refreshUser }}>
      {children}
    </TelegramContext.Provider>
  );
};
