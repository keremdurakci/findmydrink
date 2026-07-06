import { createClient } from "@supabase/supabase-js";

// Server-side Supabase instance — ONLY import this from API routes /
// server components, never from client components. Uses the service
// role key, which bypasses row-level security, so every write here
// must be validated manually before it touches the database.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
