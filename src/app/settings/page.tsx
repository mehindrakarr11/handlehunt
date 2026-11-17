"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { useHandleStore } from "@/lib/client-store";
export default function Settings() {
  const router = useRouter();
  const { mode, email, notify } = useHandleStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const client = browserClient();
    if (client)
      void client.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          const { data, error } = await client
            .from("user_profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle();
          if (error) notify("Could not load your profile. Check migrations.");
          else setName(data?.display_name || "");
        }
      });
  }, [notify]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const client = browserClient();
      if (!client) throw new Error("Profile settings require Supabase.");
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Sign in first.");
      const { error } = await client
        .from("user_profiles")
        .upsert({
          id: user.id,
          display_name: name.trim().slice(0, 80),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      notify("Profile updated");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Profile update failed.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    const { error } = await browserClient()!.auth.signOut();
    if (error) {
      notify(error.message);
      setBusy(false);
    } else {
      window.dispatchEvent(new Event("handlehunt:auth"));
      router.push("/login");
      router.refresh();
    }
  }
  return (
    <main className="main-wrap py-10 min-h-[70vh]">
      <span className="eyebrow">ACCOUNT & PRIVACY</span>
      <h1 className="heading-large mt-3">Your workspace.</h1>
      <section className="surface-card mt-8 p-7 max-w-xl">
        <p>
          {mode === "demo"
            ? "Local demo · no cloud account connected"
            : email || "Sign in to manage your profile"}
        </p>
        {email ? (
          <>
            <form onSubmit={save} className="mt-6 space-y-4">
              <label className="field-label">
                Display name
                <input
                  className="text-field mt-2"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="primary-button" disabled={busy}>
                Save profile
              </button>
            </form>
            <button
              className="secondary-button mt-6"
              disabled={busy}
              onClick={() => void logout()}
            >
              Log out
            </button>
          </>
        ) : (
          <Link href="/login" className="secondary-button mt-5">
            Account sign-in
          </Link>
        )}
        <p className="field-hint mt-6">
          Demo data stays in this browser and is never automatically uploaded.
          CSV exports are portable backups. Cloud records are restricted to your
          account. Instagram credentials are never collected.
        </p>
      </section>
    </main>
  );
}
