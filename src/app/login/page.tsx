"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { z } from "zod";
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const client = browserClient();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error"))
      setMessage(
        "That sign-in link expired or could not be verified. Request a new sign-in email.",
      );
  }, []);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const address = z.email().max(254).parse(email.trim());
      if (!client)
        throw new Error("Supabase is not configured. Use the local demo.");
      const { error } = await client.auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
      setMessage(
        "Check your email for a HandleHunt sign-in link or code. Use the same browser for magic links.",
      );
    } catch (e) {
      setMessage(
        e instanceof z.ZodError
          ? "Enter a valid email address."
          : e instanceof Error
            ? e.message
            : "Unable to send email.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setBusy(true);
    setMessage("");
    try {
      if (!/^\d{6,10}$/.test(token))
        throw new Error("Enter the email code (6–10 digits).");
      const { error } = await client.auth.verifyOtp({
        email: email.trim(),
        token,
        type: "email",
      });
      if (error) throw error;
      {
        window.dispatchEvent(new Event("handlehunt:auth"));
        router.push("/discover");
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Code verification failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="main-wrap py-12 min-h-[70vh]">
      <section className="surface-card p-7 max-w-lg mx-auto">
        <span className="eyebrow">YOUR HANDLEHUNT ACCOUNT</span>
        <h1 className="text-3xl font-bold mt-3">Welcome to your workspace.</h1>
        <p className="text-sm text-[#a4a1b7] leading-7 mt-4">
          Sign in by email to sync your private shortlist and verification
          history. This is HandleHunt authentication. Never enter an Instagram
          password or Instagram OTP here.
        </p>
        {!client ? (
          <div className="notice-strip mt-6">
            Cloud login is not configured.{" "}
            <Link href="/discover" className="underline">
              Explore the local demo
            </Link>
            .
          </div>
        ) : (
          <>
            <form onSubmit={send} className="space-y-4 mt-6">
              <label className="field-label">
                Email address
                <input
                  className="text-field mt-2"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSent(false);
                  }}
                />
              </label>
              <button className="primary-button" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : sent
                    ? "Resend sign-in email"
                    : "Send sign-in email"}
              </button>
            </form>
            {sent && (
              <form onSubmit={verify} className="space-y-4 mt-6">
                <label className="field-label">
                  HandleHunt email code (if included)
                  <input
                    className="text-field mt-2"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={10}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </label>
                <button className="secondary-button" disabled={busy}>
                  Verify email code
                </button>
              </form>
            )}
          </>
        )}
        {message && (
          <p role="status" className="notice-strip mt-5">
            {message}
          </p>
        )}
        <p className="field-hint mt-6">
          Expired link? Request a new email. Codes and links are single use.
          HandleHunt never stores your code.
        </p>
      </section>
    </main>
  );
}
