"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTelegram } from "../contexts/TelegramProvider";
import { useChat } from "../contexts/ChatProvider";
import { MessageSquare, Users, User, Megaphone } from "lucide-react";
import { Api } from "telegram";
import { MorphingBlob } from "@/components/ui/MorphingBlob";

// Helper type for dialogs since gram.js types can be tricky
interface DialogItem {
  id: string;
  title: string;
  isGroup: boolean;
  isChannel: boolean;
  isUser: boolean;
  unreadCount: number;
  date: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity?: any; // Store entity for photo downloading
  photoUrl?: string;
}

export default function ChatList() {
  const { client } = useTelegram();
  const { selectChat, setSelectedChatTitle, setSelectedChatPhotoUrl, selectedChatId } = useChat();
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchDialogs = useCallback(async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const result = await client.getDialogs({ limit: 50 }); // Fetch top 50 chats

      const mappedDialogs: DialogItem[] = result.map(d => {
        let title = d.title || "Unknown";
        // Attempt to fix empty titles if entity is available
        if (!title && d.entity) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entity = d.entity as any;
          title = entity.firstName
            ? `${entity.firstName} ${entity.lastName || ""}`.trim()
            : (entity.title || "Unknown Chat");
        }

        return {
          id: d.id ? d.id.toString() : "0",
          title: title,
          isGroup: d.isGroup,
          isChannel: d.isChannel,
          isUser: d.isUser,
          unreadCount: d.unreadCount,
          date: d.date,
          entity: d.entity,
        };
      });
      setDialogs(mappedDialogs);
    } catch (e) {
      console.error("Failed to fetch dialogs", e);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      fetchDialogs();
    }
  }, [client, fetchDialogs]);

  // Lazy load photos logic
  useEffect(() => {
    if (!client || dialogs.length === 0) return;

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          const dialog = dialogs[index];

          if (dialog && !dialog.photoUrl && dialog.entity) {
            // Stop observing this element immediately
            observerRef.current?.unobserve(entry.target);

            // Fetch photo
            client.downloadProfilePhoto(dialog.entity, { isBig: true }).then((buffer) => {
              if (buffer && buffer.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const blob = new Blob([buffer as any], { type: "image/jpeg" });
                const url = URL.createObjectURL(blob);

                setDialogs(prev => prev.map((d, i) => i === index ? { ...d, photoUrl: url } : d));
              }
            }).catch(err => console.error("Failed to load photo", err));
          }
        }
      });
    }, { rootMargin: "50px" });

    // Observe all chat items
    const elements = document.querySelectorAll('.chat-item-observer');
    elements.forEach(el => observerRef.current?.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [client, dialogs]); // Re-run when dialogs (initially) load

  const handleChatClick = (chat: DialogItem) => {
    setSelectedChatTitle(chat.title);
    setSelectedChatPhotoUrl(chat.photoUrl || null);
    selectChat(chat.id);
  };

  const getIcon = (chat: DialogItem) => {
    if (chat.photoUrl) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={chat.photoUrl} alt="" className="w-full h-full object-cover" />;
    }
    if (chat.isChannel) return <Megaphone className="w-5 h-5 text-zinc-500" />;
    if (chat.isGroup) return <Users className="w-5 h-5 text-zinc-500" />;
    return <User className="w-5 h-5 text-zinc-500" />;
  };

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
        Chats
      </h2>
      <div className="space-y-1">
        {dialogs.map((chat, index) => {
          const isActive = chat.id === selectedChatId;
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
