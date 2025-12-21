"use client";

import Auth from "../components/Auth";
import ChatList from "../components/ChatList";
import ChatMusicView from "../components/ChatMusicView";
import Player from "../components/Player";
import { useTelegram } from "../contexts/TelegramProvider";
import { useChat } from "../contexts/ChatProvider";
import Image from "next/image";

export default function Home() {
  const { user, isLoading } = useTelegram();
  const { selectedChatId } = useChat();

  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)]">
      <header className="p-4 border-b border-zinc-200 dark:border-purple-500/20 flex justify-between items-center sticky top-0 glass-panel z-40">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-purple-900/50 rounded-lg">
                <Image src="/vercel.svg" alt="App Logo" width={20} height={20} className="dark:invert" />
            </div>
            <h1 className="text-xl font-bold tracking-tight dark:text-purple-100 dark:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">Telefy</h1>
        </div>
        {user && (
           <div className="flex items-center gap-4">
               <span className="text-sm text-zinc-500 dark:text-purple-300">Logged in as {user.firstName}</span>
               {/* Logout is handled in context but we could add a button here later */}
           </div>
        )}
      </header>

      <main className="flex flex-col items-center justify-start pt-8 px-4">
        {isLoading ? (
           <div className="flex items-center justify-center h-64 w-full">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
           </div>
        ) : !user ? (
          <Auth />
        ) : (
          <>
            {!selectedChatId ? <ChatList /> : <ChatMusicView />}
            <Player />
          </>
        )}
      </main>
    </div>
  );
}

