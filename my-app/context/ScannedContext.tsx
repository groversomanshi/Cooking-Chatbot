"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ScannedItem } from "@/types/ingredient";

/**
 * Local-only state for a single camera/scan session. Lives in memory while the
 * user reviews and confirms; persistence happens when they tap "Add to pantry"
 * (see PantryContext.addIds). Nothing here ever hits the database.
 */
type ScannedContextValue = {
  items: ScannedItem[];
  addItems: (next: ScannedItem[]) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const ScannedContext = createContext<ScannedContextValue | null>(null);

export function ScannedProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ScannedItem[]>([]);

  const addItems = useCallback((next: ScannedItem[]) => {
    setItems((prev) => [...prev, ...next]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, addItems, removeItem, clear }),
    [items, addItems, removeItem, clear],
  );

  return <ScannedContext.Provider value={value}>{children}</ScannedContext.Provider>;
}

export function useScannedItems() {
  const ctx = useContext(ScannedContext);
  if (!ctx) throw new Error("useScannedItems must be used inside <ScannedProvider>");
  return ctx;
}
