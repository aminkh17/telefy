"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Api } from "telegram";

interface ChatContextType {
  selectedChatId: string | null;
  selectChat: (chatId: string | null) => void;
  selectedChatTitle: string | null;
  setSelectedChatTitle: (title: string | null) => void;
  selectedChatPhotoUrl: string | null;
  setSelectedChatPhotoUrl: (url: string | null) => void;
}

const ChatContext = createContext<ChatContextType>({
  selectedChatId: null,
  selectChat: () => {},
  selectedChatTitle: null,
  setSelectedChatTitle: () => {},
  selectedChatPhotoUrl: null,
  setSelectedChatPhotoUrl: () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatTitle, setSelectedChatTitleState] = useState<string | null>(null);
  const [selectedChatPhotoUrl, setSelectedChatPhotoUrl] = useState<string | null>(null);

  const selectChat = useCallback((chatId: string | null) => {
    setSelectedChatId(chatId);
    if (chatId === null) {
        setSelectedChatTitleState(null);
        setSelectedChatPhotoUrl(null);
    }
  }, []);

  const setSelectedChatTitle = useCallback((title: string | null) => {
    setSelectedChatTitleState(title);
  }, []);

  return (
    <ChatContext.Provider value={{ selectedChatId, selectChat, selectedChatTitle, setSelectedChatTitle, selectedChatPhotoUrl, setSelectedChatPhotoUrl }}>
      {children}
    </ChatContext.Provider>
  );
};
