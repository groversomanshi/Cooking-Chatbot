"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@/types/user";

function toUser(input: { id: string; email?: string | null } | null): User | null {
  if (!input) return null;
  return { id: input.id, email: input.email ?? "" };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    async function hydrate() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) throw error;
        setUser(toUser(data.session?.user ?? null));
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    hydrate();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
