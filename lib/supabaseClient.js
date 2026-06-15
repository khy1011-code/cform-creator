import { createClient } from "@supabase/supabase-js";

// Read public env vars (these are safe to expose to the browser).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// "Is Supabase configured?" — true only when BOTH values are present
// and aren't the placeholder text from .env.local.example.
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes("YOUR-PROJECT") && !anonKey.includes("YOUR-")
);

// Create the client only when configured. If not, the app silently
// falls back to DEMO MODE (browser localStorage) and never crashes.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
