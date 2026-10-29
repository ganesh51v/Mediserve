import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client instance configured for React Router and client-side operations.
 * Reads environment variables from VITE_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 * and VITE_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 */
export function createSupabaseClient() {
  const supabaseUrl =
    (typeof process !== "undefined" &&
      (process.env.VITE_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL)) ||
    "https://oosflbszoccmrwqfdyjo.supabase.co";

  const supabaseKey =
    (typeof process !== "undefined" &&
      (process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.SUPABASE_KEY)) ||
    "sb_publishable_19BCwWe2ZcKuyS0__ZXeaQ_oKsHggoX";

  return createClient(supabaseUrl, supabaseKey);
}

export const supabase = createSupabaseClient();
export default supabase;
