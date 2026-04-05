import { createClient } from "@supabase/supabase-js";

// These are safe to expose in the browser — they identify your project
// but carry no elevated privileges. The service role key NEVER goes here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not set. " +
    "Auth will not work until these are configured."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder",
  {
    auth: {
      persistSession: true,
      storageKey: "bf_supabase_session",
      autoRefreshToken: true,
    },
  }
);
