"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  addIngredientsToPantry,
  getPantry,
  removeIngredientFromPantry,
} from "@/lib/api/pantry";
import type { Ingredient } from "@/types/ingredient";

type PantryContextValue = {
  items: Ingredient[];
  loading: boolean;
  error: string | null;
  /** Add ingredient ids (deduped) to the user's pantry. */
  addIds: (ids: number[]) => Promise<void>;
  /** Remove a single ingredient id from the user's pantry. */
  removeId: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const PantryContext = createContext<PantryContextValue | null>(null);

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getPantry(user.id);
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pantry");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const addIds = useCallback(
    async (ids: number[]) => {
      if (!user) throw new Error("Log in to update your pantry");
      if (ids.length === 0) return;
      setError(null);
      try {
        await addIngredientsToPantry(user.id, ids);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update pantry");
        throw e;
      }
    },
    [user, refresh],
  );

  const removeId = useCallback(
    async (id: number) => {
      if (!user) throw new Error("Log in to update your pantry");
      setError(null);
      // Optimistic remove
      setItems((prev) => prev.filter((i) => i.ingredientId !== id));
      try {
        await removeIngredientFromPantry(user.id, id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update pantry");
        await refresh();
        throw e;
      }
    },
    [user, refresh],
  );

  const value = useMemo(
    () => ({ items, loading, error, addIds, removeId, refresh }),
    [items, loading, error, addIds, removeId, refresh],
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}

export function usePantry() {
  const ctx = useContext(PantryContext);
  if (!ctx) throw new Error("usePantry must be used inside <PantryProvider>");
  return ctx;
}
