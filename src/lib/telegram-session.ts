import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "telegram_session_id";
const SESSIONS_DIR = path.join(process.cwd(), ".sessions");

// Ensure sessions directory exists
(async () => {
    try {
        await fs.mkdir(SESSIONS_DIR, { recursive: true });
    } catch (e) {
        console.error("Failed to create sessions directory", e);
    }
})();

export async function getSessionId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function getSession(): Promise<string> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) return "";

  try {
      const filePath = path.join(SESSIONS_DIR, `${sessionId}.txt`);
      const session = await fs.readFile(filePath, "utf-8");
      return session;
  } catch (e) {
      // File not found or error, return empty
      return "";
  }
}

export async function setSession(session: string) {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
      sessionId = crypto.randomUUID();
      cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
  }

  const filePath = path.join(SESSIONS_DIR, `${sessionId}.txt`);
  await fs.writeFile(filePath, session, "utf-8");
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (sessionId) {
      try {
          const filePath = path.join(SESSIONS_DIR, `${sessionId}.txt`);
          await fs.unlink(filePath);
      } catch (e) {
          // Ignore
      }
  }
  
  cookieStore.delete(SESSION_COOKIE_NAME);
}