import { supabase } from "@/lib/supabase/client";

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export type SignUpResult = {
  /** True when Supabase returned an active session (email confirmation disabled). */
  hasSession: boolean;
  /** True when Supabase created the user but is waiting on email confirmation. */
  needsEmailConfirmation: boolean;
};

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return {
    hasSession: !!data.session,
    needsEmailConfirmation: !data.session && !!data.user,
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
