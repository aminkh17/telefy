import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TelegramProvider } from "../contexts/TelegramProvider";
import { PlayerProvider } from "../contexts/PlayerContext";
import { ChatProvider } from "../contexts/ChatProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { BubbleBackground } from "../components/ui/BubbleBackground";

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-shiny-cyber text-zinc-900 dark:text-purple-50 min-h-screen`}
      >
        <ThemeProvider>
            <div className="fixed inset-0 z-0 pointer-events-none">
                <BubbleBackground 
                    backgroundColor="transparent" 
                    bubbleCount={20} 
                    bubbleColors={["#9333ea", "#c026d3", "#2563eb"]} // purple, pink, blue
                    mouseInteraction={true}
                />
            </div>
            <div className="relative z-10 min-h-screen">
                <TelegramProvider>
                    <ChatProvider>
                        <PlayerProvider>
                            {children}
                        </PlayerProvider>
                    </ChatProvider>
                </TelegramProvider>
            </div>
        </ThemeProvider>
      </body>
    </html>
  );
}