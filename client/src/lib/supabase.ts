import { createClient } from "@supabase/supabase-js";

// These are safe to expose in the browser — they identify your project
// but carry no elevated privileges. The service role key NEVER goes here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in client/.env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persist session in localStorage so page reloads don't require re-login.
    // onAuthStateChange fires whenever the token is auto-refreshed.
    persistSession: true,
    storageKey: "bf_supabase_session",
    autoRefreshToken: true,
  },
});
