import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TelegramProvider } from "../contexts/TelegramProvider";
import { PlayerProvider } from "../contexts/PlayerContext";
import { ChatProvider } from "../contexts/ChatProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { BubbleBackground } from "@/components/ui/BubbleBackground";

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
          <div className="fixed inset-0 z-0">
            <BubbleBackground
              bgColorA="rgb(30, 0, 60)"
              bgColorB="rgb(0, 30, 90)"
              bubbleColors={{
                colorA: "50, 150, 255",
                colorB: "200, 80, 255",
                colorC: "120, 240, 255",
                colorD: "220, 60, 80",
                colorE: "200, 200, 80",
                interactive: "160, 120, 255",
              }}
              bubbleSize="70%"
              blendMode="screen"
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