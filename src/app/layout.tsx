import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TelegramProvider } from "../contexts/TelegramProvider";
import { PlayerProvider } from "../contexts/PlayerContext";
import { ChatProvider } from "../contexts/ChatProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Telefy - Music Client",
  description: "A telegram client for music",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen`}
      >
        <TelegramProvider>
            <ChatProvider>
                <PlayerProvider>
                    {children}
                </PlayerProvider>
            </ChatProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}