// Server-side Supabase client (for use in server components / route handlers).
// TODO: install `@supabase/ssr` and wire up cookie-based session handling:
//   import { createServerClient } from "@supabase/ssr";
//   import { cookies } from "next/headers";
//
//   export async function createClient() {
//     const cookieStore = await cookies();
//     return createServerClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
//     );
//   }

export async function createClient() {
  return null;
}
