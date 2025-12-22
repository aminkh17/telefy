"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface SelectedChat {
    id: string;
    title: string;
    photoUrl: string | null;
    accessHash: string;
    type: 'user' | 'channel' | 'chat';
}

interface ChatContextType {
  selectedChat: SelectedChat | null;
  selectChat: (chat: SelectedChat | null) => void;
}

const ChatContext = createContext<ChatContextType>({
  selectedChat: null,
  selectChat: () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);

  const selectChat = useCallback((chat: SelectedChat | null) => {
    setSelectedChat(chat);
  }, []);

  return (
    <ChatContext.Provider value={{ selectedChat, selectChat }}>
      {children}
    </ChatContext.Provider>
  );
};
