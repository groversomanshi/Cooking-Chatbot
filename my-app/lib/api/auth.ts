import { supabase } from "@/lib/supabase/client";

export async function signIn(email: string, password: string) {
  // TODO: replace stub with real call once Supabase client is wired up.
  await supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  await supabase.auth.signUp({ email, password });
}

export async function signOut() {
  await supabase.auth.signOut();
}
