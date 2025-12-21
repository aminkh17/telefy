"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";

interface TelegramContextType {
  client: TelegramClient | null;
  isConnected: boolean;
  user: Api.User | null;
  sessionString: string | null;
  isLoading: boolean;
  apiId: number | null;
  apiHash: string | null;
  connect: () => Promise<void>;
  logOut: () => Promise<void>;
}

const TelegramContext = createContext<TelegramContextType>({
  client: null,
  isConnected: false,
  user: null,
  sessionString: null,
  isLoading: true,
  apiId: null,
  apiHash: null,
  connect: async () => {},
  logOut: async () => {},
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  const [client, setClient] = useState<TelegramClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<Api.User | null>(null);
  const [sessionString, setSessionString] = useState<string | null>(null);
  const [apiId, setApiId] = useState<number | null>(null);
  const [apiHash, setApiHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem("telegram_session");
    // Only set if explicitly null to allow initial load
    if (savedSession !== null) {
        setSessionString(savedSession);
    } else {
        setSessionString("");
    }
  }, []);

  useEffect(() => {
    const initClient = async () => {
        if (sessionString === null || apiId === null || apiHash === null) return; // Wait for local storage load and config fetch

        const session = new StringSession(sessionString || "");
        const newClient = new TelegramClient(session, apiId, apiHash, {
          connectionRetries: 5,
        });

        try {
            await newClient.connect();
            setClient(newClient);
            setIsConnected(true);

            // Check if already authorized
            if (await newClient.checkAuthorization()) {
                 const me = await newClient.getMe();
                 if (me instanceof Api.User) {
                     setUser(me);
                 }
            }
        } catch (err) {
            console.error("Connection failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    initClient();
  }, [sessionString, apiId, apiHash]); 

  const logOut = async () => {
      if (client) {
          await client.disconnect();
      }
      localStorage.removeItem("telegram_session");
      setSessionString("");
      setUser(null);
      setIsConnected(false);
      setClient(null);
      // Force reload to clear client state cleanly
      window.location.reload(); 
  };
  
  const connect = async () => {
      // Re-triggering init via state if needed, or just relying on existing client
      if (!client && sessionString !== null) {
          // This is a bit recursive if we just call initClient, 
          // but mainly we rely on the effect.
      }
  };


  return (
    <TelegramContext.Provider value={{ client, isConnected, user, sessionString, isLoading, apiId, apiHash, connect, logOut }}>
      {children}
    </TelegramContext.Provider>
  );
};
