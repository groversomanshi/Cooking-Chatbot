import type { ScannedItem } from "@/types/ingredient";

// TODO: persist scanned items to Supabase so they survive navigation / reloads.

export async function saveScannedItems(items: ScannedItem[]): Promise<void> {
  void items;
}

export async function getScannedItems(): Promise<ScannedItem[]> {
  return [];
}
