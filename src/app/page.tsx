"use client";

import Auth from "../components/Auth";
import ChatList from "../components/ChatList";
import ChatMusicView from "../components/ChatMusicView";
import Player from "../components/Player";
import { useTelegram } from "../contexts/TelegramProvider";
import { useChat } from "../contexts/ChatProvider";

export default function Home() {
  const { user, isLoading } = useTelegram();
  const { selectedChatId } = useChat();

  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)]">
      <header className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-40">
        <h1 className="text-xl font-bold tracking-tight">Telefy</h1>
        {user && (
           <div className="flex items-center gap-4">
               <span className="text-sm text-zinc-500">Logged in as {user.firstName}</span>
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

