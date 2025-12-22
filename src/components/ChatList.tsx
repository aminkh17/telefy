"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useChat } from "../contexts/ChatProvider";
import { MessageSquare, Users, User, Megaphone } from "lucide-react";
import { MorphingBlob } from "@/components/ui/MorphingBlob";
import { fetchDialogs, ChatDialog } from "@/app/actions/chat";

interface DialogItem extends ChatDialog {
  photoUrl: string;
}

export default function ChatList() {
  const { selectChat, selectedChat } = useChat();
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchChats, setSearchChats] = useState("");

  const filteredDialogs = dialogs.filter(dialog =>
    dialog.title.toLowerCase().includes(searchChats.toLowerCase())
  );

  const loadDialogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchDialogs(50);

      const mappedDialogs: DialogItem[] = result.map(d => {
        // Construct photo URL
        const photoUrl = `/api/telegram/media?id=${d.id}&accessHash=${d.accessHash || ''}&type=${d.type}`;
        
        return {
          ...d,
          photoUrl
        };
      });
      setDialogs(mappedDialogs);
    } catch (e) {
      console.error("Failed to fetch dialogs", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDialogs();
  }, [loadDialogs]);

  const handleChatClick = (chat: DialogItem) => {
    selectChat({
        id: chat.id,
        title: chat.title,
        photoUrl: chat.photoUrl || null,
        accessHash: chat.accessHash || "",
        type: chat.type
    });
  };

  const getIcon = (chat: DialogItem) => {
    // We use standard img with error fallback (hidden if fails)
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
            src={chat.photoUrl} 
            alt={chat.title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
                // If image fails to load, hide it and show default icon
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }} 
        />
    );
  };
  
  const getDefaultIcon = (chat: DialogItem) => {
      if (chat.isChannel) return <Megaphone className="w-5 h-5 text-zinc-500" />;
      if (chat.isGroup) return <Users className="w-5 h-5 text-zinc-500" />;
      return <User className="w-5 h-5 text-zinc-500" />;
  }

  if (isLoading && dialogs.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 mr-4"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3"></div>
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-purple-100 dark:drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
        <MessageSquare className="w-6 h-6 dark:text-purple-400" />
        <input
          type="text"
          placeholder="Search channels, groups, or chats..."
          value={searchChats}
          className="bg-transparent focus:outline-none w-full placeholder-zinc-500 dark:placeholder-purple-400"
          onChange={(e) => setSearchChats(e.target.value)}
        />
      </h2>
      <div className="space-y-1">
        {filteredDialogs.map((chat, index) => {
          const isActive = chat.id === selectedChat?.id;
          return (
            <button
              key={chat.id.toString()}
              onClick={() => handleChatClick(chat)}
              data-index={index}
              className="chat-item-observer w-full flex items-center p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-purple-900/30 transition-all text-left group border border-transparent dark:hover:border-purple-500/20 relative overflow-hidden"
            >
              {isActive && (
                <MorphingBlob
                  className="absolute inset-0 w-full h-full -z-10 opacity-60 backdrop-blur-sm"
                  size="100%"
                  theme="aurora"
                  complexity={0.5}
                  speed={0.2}
                  enableEffects={false}
                />
              )}

              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-purple-900/20 flex items-center justify-center mr-4 shrink-0 border border-zinc-200 dark:border-purple-500/20 group-hover:border-blue-200 dark:group-hover:border-purple-500/50 transition-colors overflow-hidden relative shadow-[0_0_10px_rgba(0,0,0,0.2)]">
                {getIcon(chat)}
                <div className="hidden absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-purple-900/20">
                     {getDefaultIcon(chat)}
                </div>
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`font-medium truncate pr-2 transition-colors ${isActive ? 'text-white drop-shadow-md' : 'text-zinc-900 dark:text-purple-50 group-hover:dark:text-white'}`}>
                    {chat.title}
                  </h3>
                  {chat.unreadCount > 0 && (
                    <span className="bg-blue-600 dark:bg-purple-600 dark:shadow-[0_0_8px_rgba(147,51,234,0.6)] text-white text-xs px-2 py-0.5 rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate transition-colors ${isActive ? 'text-purple-100' : 'text-zinc-500 dark:text-purple-400/70 group-hover:dark:text-purple-300'}`}>
                  {chat.isChannel ? "Channel" : chat.isGroup ? "Group" : "Private Chat"}
                </p>
              </div>
            </button>
          );
        })}
        {dialogs.length === 0 && !isLoading && (
          <div className="text-center py-20 text-zinc-500 dark:text-purple-400/50">No chats found.</div>
        )}
      </div>
    </div>
  );
}