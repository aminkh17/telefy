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
  connect: () => Promise<void>;
  logOut: () => Promise<void>;
}

const TelegramContext = createContext<TelegramContextType>({
  client: null,
  isConnected: false,
  user: null,
  sessionString: null,
  isLoading: true,
  connect: async () => {},
  logOut: async () => {},
});

export const useTelegram = () => useContext(TelegramContext);

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  const [client, setClient] = useState<TelegramClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<Api.User | null>(null);
  const [sessionString, setSessionString] = useState<string | null>(null);
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
        if (sessionString === null) return; // Wait for local storage load

        const apiId = process.env.TELEGRAM_API_ID;
        const apiHash = process.env.TELEGRAM_API_HASH;

        if (!apiId || !apiHash) {
          console.error("Missing API_ID or API_HASH");
          setIsLoading(false);
          return;
        }

        const session = new StringSession(sessionString || "");
        const newClient = new TelegramClient(session, parseInt(apiId), apiHash, {
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
  }, [sessionString]); 

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
    <TelegramContext.Provider value={{ client, isConnected, user, sessionString, isLoading, connect, logOut }}>
      {children}
    </TelegramContext.Provider>
  );
};
