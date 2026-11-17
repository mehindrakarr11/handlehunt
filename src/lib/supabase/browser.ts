"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfigured } from "./config";
export function browserClient() {
  return supabaseConfigured()
    ? createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      )
    : null;
}
