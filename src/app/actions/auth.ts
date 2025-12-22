"use server";

import { Api } from "telegram";
import { getTelegramClient, saveClientSession } from "@/lib/telegram-client";
import { setSession, clearSession } from "@/lib/telegram-session";

export async function sendCode(phoneNumber: string) {
    const client = await getTelegramClient();
    try {
        const result = await client.invoke(
            new Api.auth.SendCode({
                apiId: Number(process.env.TELEGRAM_API_ID),
                apiHash: process.env.TELEGRAM_API_HASH || "",
                phoneNumber: phoneNumber,
                settings: new Api.CodeSettings({
                    allowFlashcall: false,
                    currentNumber: false,
                    allowAppHash: false,
                }),
            })
        );

        // Save the session (contains the auth key for this flow)
        await saveClientSession(client);
        
        // Do not disconnect, keep singleton alive

        // Check type of result
        // The result 'phoneCodeHash' is directly available on the Auth.SentCode object
        const sentCode = result as Api.auth.SentCode;

        return {
            phoneCodeHash: sentCode.phoneCodeHash,
            isCodeViaApp: sentCode.type instanceof Api.auth.SentCodeTypeApp,
        };
    } catch (e: any) {
        // Do not disconnect
        console.error("sendCode error", e);
        return { error: e.message || "Failed to send code" };
    }
}

export async function signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string) {
    // Use the session that initiated the code request
    const client = await getTelegramClient();
    try {
        await client.invoke(
            new Api.auth.SignIn({
                phoneNumber,
                phoneCodeHash,
                phoneCode
            })
        );

        await saveClientSession(client);

        return { success: true };
    } catch (e: any) {
        const msg = e.message || e.errorMessage || "";
        if (typeof msg === 'string' && (msg.includes("SESSION_PASSWORD_NEEDED") || msg.includes("PASSWORD_REQUIRED"))) {
            // Save the partial session so we can continue with password
            await saveClientSession(client);
            return { requiresPassword: true };
        }

        return { error: msg || "Failed to sign in" };
    }
}

export async function signInWithPassword(password: string) {
    let client;
    try {
        // Use the session saved from signIn
        client = await getTelegramClient();

        await client.signInWithPassword(
            {
                apiId: Number(process.env.TELEGRAM_API_ID),
                apiHash: process.env.TELEGRAM_API_HASH || ""
            },
            {
                password: async () => password,
                onError: (err) => { throw err; }
            }
        );

        await saveClientSession(client);

        return { success: true };
    } catch (e: any) {
        return { error: e.message || "Incorrect password" };
    }
}

export async function signOut() {
    try {
        const client = await getTelegramClient();
        await client.disconnect(); // Or client.invoke(new Api.auth.LogOut()) if we want to kill it on server too
    } catch (e) {
        // ignore
    }
    await clearSession();
    return { success: true };
}

export async function getMe() {
    try {
        const client = await getTelegramClient();
        const me = await client.getMe();

        if (me instanceof Api.User) {
            return {
                id: me.id.toString(),
                username: me.username,
                firstName: me.firstName,
                lastName: me.lastName,
                phone: me.phone
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}
