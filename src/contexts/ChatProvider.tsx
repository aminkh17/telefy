"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Api } from "telegram";

interface ChatContextType {
  selectedChatId: bigInt.BigInteger | null;
  selectChat: (chatId: bigInt.BigInteger | null) => void;
  selectedChatTitle: string | null;
  setSelectedChatTitle: (title: string | null) => void;
}

const ChatContext = createContext<ChatContextType>({
  selectedChatId: null,
  selectChat: () => {},
  selectedChatTitle: null,
  setSelectedChatTitle: () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedChatId, setSelectedChatId] = useState<bigInt.BigInteger | null>(null);
  const [selectedChatTitle, setSelectedChatTitleState] = useState<string | null>(null);

  const selectChat = useCallback((chatId: bigInt.BigInteger | null) => {
    setSelectedChatId(chatId);
    if (chatId === null) {
        setSelectedChatTitleState(null);
    }
  }, []);

  const setSelectedChatTitle = useCallback((title: string | null) => {
    setSelectedChatTitleState(title);
  }, []);

  return (
    <ChatContext.Provider value={{ selectedChatId, selectChat, selectedChatTitle, setSelectedChatTitle }}>
      {children}
    </ChatContext.Provider>
  );
};
