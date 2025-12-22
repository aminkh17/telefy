import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { getSession, getSessionId, setSession } from "./telegram-session";
import { LogLevel } from "telegram/extensions/Logger";

const API_ID = Number(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;

// Global cache to prevent FloodWait errors by reusing clients
const globalForTelegram = global as unknown as { telegramClients: Map<string, TelegramClient> };
const clients = globalForTelegram.telegramClients || new Map<string, TelegramClient>();
if (process.env.NODE_ENV !== 'production') globalForTelegram.telegramClients = clients;

export async function getTelegramClient() {
  const session = await getSession();
  const sessionId = await getSessionId();
  
  if (!API_ID || !API_HASH) {
      throw new Error("Telegram API ID or Hash not set in environment variables");
  }

  // If we have a cached client for this session, reuse it
  if (sessionId && clients.has(sessionId)) {
      const cachedClient = clients.get(sessionId);
      if (cachedClient && cachedClient.connected) {
          return cachedClient;
      }
  }

  // Create a new client instance
  const client = new TelegramClient(
    new StringSession(session),
    API_ID,
    API_HASH,
    {
      connectionRetries: 5,
      useWSS: false, // Use standard TCP/HTTP
    }
  );
  
  client.setLogLevel(LogLevel.ERROR);

  await client.connect();
  
  // Cache the connected client
  if (sessionId) {
      clients.set(sessionId, client);
  }
  
  return client;
}

export async function saveClientSession(client: TelegramClient) {
    if (client.session && client.session.save) {
        const newSession = (client.session.save() as unknown) as string;
        // We can optimize by not reading from disk every time if we trust the client state,
        // but checking against disk is safer for multi-process (though we are single process mostly).
        // Let's just save. The file system write is fast enough.
        // Actually, let's keep the check to reduce IO.
        const currentSession = await getSession();
        
        if (newSession !== currentSession) {
            await setSession(newSession);
        }
    }
}
