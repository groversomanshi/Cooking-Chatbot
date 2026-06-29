import { backendFetch } from "@/lib/api/backend";
import type { Ingredient } from "@/types/ingredient";

/** Fetch ingredient rows for a given list of bigint ids. */
export async function getIngredientsByIds(ids: number[]): Promise<Ingredient[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams({ ids: ids.join(",") });
  const res = await backendFetch(`/ingredients?${params.toString()}`);
  return (await res.json()) as Ingredient[];
}

/** Case-insensitive prefix search for the AddIngredient autocomplete. */
export async function searchIngredients(query: string, limit = 20): Promise<Ingredient[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await backendFetch(`/ingredients?${params.toString()}`);
  return (await res.json()) as Ingredient[];
}

/** Try to resolve free-text scan labels to real ingredient rows by exact (case-insensitive) name. */
export async function resolveIngredientNames(names: string[]): Promise<Ingredient[]> {
  const cleaned = Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)));
  if (cleaned.length === 0) return [];
  const params = new URLSearchParams({ names: cleaned.join(",") });
  const res = await backendFetch(`/ingredients?${params.toString()}`);
  return (await res.json()) as Ingredient[];
}
