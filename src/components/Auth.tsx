"use client";

import React, { useState } from "react";
import { useTelegram } from "../contexts/TelegramProvider";
import { Api } from "telegram";

export default function Auth() {
  const { client, user } = useTelegram();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    if (!client) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await client.invoke(
        new Api.auth.SendCode({
          apiId: parseInt(process.env.NEXT_PUBLIC_TELEGRAM_API_ID || "0"),
          apiHash: process.env.NEXT_PUBLIC_TELEGRAM_API_HASH || "",
          phoneNumber: phoneNumber,
          settings: new Api.CodeSettings({
            allowFlashcall: false,
            currentNumber: false,
            allowAppHash: false,
          }),
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPhoneCodeHash((result as any).phoneCodeHash);
      setStep("code");
    } catch (e: unknown) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : "Failed to send code.";
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!client) return;
    setIsLoading(true);
    setError("");
    try {
      // Use raw API call as client.signIn helper might be missing or inconsistent
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phoneNumber,
          phoneCodeHash: phoneCodeHash,
          phoneCode: phoneCode,
        })
      );

      const session = client.session.save();
      if (typeof session === 'string') {
          localStorage.setItem("telegram_session", session);
          window.location.reload(); 
      }
    } catch (e: any) {
      console.error(e);
      // Check for 2FA requirement
      // gramjs errors put the RPC error message in e.message or e.errorMessage
      const message = e.message || e.errorMessage || "Failed to sign in.";
      
      if (typeof message === 'string' && (message.includes("SESSION_PASSWORD_NEEDED") || message.includes("PASSWORD_REQUIRED"))) {
        setStep("password");
      } else {
        setError(typeof message === 'string' ? message : "Unknown error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async () => {
      if (!client) return;
      setIsLoading(true);
      setError("");
      
      const apiId = parseInt(process.env.NEXT_PUBLIC_TELEGRAM_API_ID || "0");
      const apiHash = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH || "";

      try {
          // Use signInWithPassword helper which handles SRP calculation
          await client.signInWithPassword(
              { apiId, apiHash },
              {
                  password: async () => password,
                  onError: (err) => { throw err; }
              }
          );
          const session = client.session.save();
          if (typeof session === 'string') {
              localStorage.setItem("telegram_session", session);
              window.location.reload();
          }
      } catch (e: any) {
          console.error(e);
          setError(e.message || "Incorrect password");
      } finally {
          setIsLoading(false);
      }
  }

  if (user) return null; // Should not render if logged in

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-100">Telegram Login</h2>
      
      {error && (
        <div className="w-full mb-4 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {step === "phone" && (
        <div className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Phone Number</label>
            <input
              type="text"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent dark:text-white"
            />
          </div>
          <button
            onClick={handleSendCode}
            disabled={isLoading || !phoneNumber}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send Code"}
          </button>
        </div>
      )}

      {step === "code" && (
        <div className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Enter Code</label>
            <input
              type="text"
              placeholder="12345"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent dark:text-white"
            />
          </div>
          <button
            onClick={handleSignIn}
            disabled={isLoading || !phoneCode}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      )}

      {step === "password" && (
          <div className="w-full flex flex-col gap-4">
              <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">2FA Password</label>
                  <input
                      type="password"
                      placeholder="Your Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent dark:text-white"
                  />
              </div>
              <button
                  onClick={handlePasswordSignIn}
                  disabled={isLoading || !password}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
              >
                  {isLoading ? "Verifying..." : "Verify Password"}
              </button>
          </div>
      )}
    </div>
  );
}