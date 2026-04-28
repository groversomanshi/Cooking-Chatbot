// Browser-side Supabase client.
//
// TODO: once `@supabase/supabase-js` is installed, replace this dev stub:
//   import { createClient } from "@supabase/supabase-js";
//   export const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//   );
//
// Until then, this stub pretends every login/signup succeeds so you can
// click through the app. Any email + password works.

const FAKE_USER = {
  id: "dev-user",
  email: "you@example.com",
};

export const supabase = {
  auth: {
    signInWithPassword: async (_: { email: string; password: string }) => ({
      data: { user: FAKE_USER, session: { user: FAKE_USER } },
      error: null,
    }),
    signUp: async (_: { email: string; password: string }) => ({
      data: { user: FAKE_USER, session: { user: FAKE_USER } },
      error: null,
    }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: FAKE_USER }, error: null }),
  },
};
