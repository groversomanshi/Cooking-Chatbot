"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import type { ScannedItem } from "@/types/ingredient";

type PantryContextValue = {
  items: ScannedItem[];
  addItems: (next: ScannedItem[]) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

export const PantryContext = createContext<PantryContextValue | null>(null);

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ScannedItem[]>([]);

  const addItems = useCallback((next: ScannedItem[]) => {
    setItems((prev) => [...prev, ...next]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, addItems, removeItem, clear }),
    [items, addItems, removeItem, clear],
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}
