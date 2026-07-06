import { createClient } from "@supabase/supabase-js";

// Bu iki değeri Supabase Dashboard > Settings > API'den alıp
// .env.local dosyana ekleyeceksin:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
