"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Ingredient } from "@/types/ingredient";

/**
 * Short-lived list of ingredients the user has accepted from the camera (or
 * added manually) but not yet committed to their pantry. Cleared on confirm
 * or cancel from the confirm page.
 */
type StagedContextValue = {
  items: Ingredient[];
  /** Idempotent: noop if the ingredient is already staged. */
  add: (ingredient: Ingredient) => void;
  remove: (id: number) => void;
  clear: () => void;
};

const StagedContext = createContext<StagedContextValue | null>(null);

export function StagedIngredientsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<Ingredient[]>([]);

  const add = useCallback((ingredient: Ingredient) => {
    setItems((prev) => {
      if (prev.some((i) => i.ingredientId === ingredient.ingredientId)) return prev;
      return [...prev, ingredient];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.ingredientId !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, add, remove, clear }),
    [items, add, remove, clear],
  );

  return <StagedContext.Provider value={value}>{children}</StagedContext.Provider>;
}

export function useStagedIngredients() {
  const ctx = useContext(StagedContext);
  if (!ctx) {
    throw new Error(
      "useStagedIngredients must be used inside <StagedIngredientsProvider>",
    );
  }
  return ctx;
}
