export function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return false;
  if (!url || !key)
    throw new Error(
      "Set both public Supabase variables, or leave both unset for local demo mode.",
    );
  return true;
}
