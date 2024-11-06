import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing env.SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing env.SUPABASE_SERVICE_KEY");
}

export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
