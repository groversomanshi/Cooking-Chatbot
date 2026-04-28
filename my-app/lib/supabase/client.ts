// Browser-side Supabase client.
// TODO: once `@supabase/supabase-js` is installed, replace this stub:
//   import { createClient } from "@supabase/supabase-js";
//   export const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//   );

export const supabase = {
  auth: {
    signInWithPassword: async (_: { email: string; password: string }) => {
      throw new Error("Supabase client not configured yet");
    },
    signUp: async (_: { email: string; password: string }) => {
      throw new Error("Supabase client not configured yet");
    },
    signOut: async () => {},
    getUser: async () => ({ data: { user: null }, error: null }),
  },
};
