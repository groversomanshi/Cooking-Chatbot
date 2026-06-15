import { supabase } from "@/lib/supabase/client";
import type { Ingredient } from "@/types/ingredient";

const SELECT = `"ingredientId", name, restrictions`;

/** Fetch ingredient rows for a given list of bigint ids. */
export async function getIngredientsByIds(ids: number[]): Promise<Ingredient[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("ingredients")
    .select(SELECT)
    .in("ingredientId", ids);
  if (error) throw error;
  return (data ?? []) as Ingredient[];
}

/** Case-insensitive prefix search for the AddIngredient autocomplete. */
export async function searchIngredients(query: string, limit = 20): Promise<Ingredient[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("ingredients")
    .select(SELECT)
    .ilike("name", `${q}%`)
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Ingredient[];
}

/** Try to resolve free-text scan labels to real ingredient rows by exact (case-insensitive) name. */
export async function resolveIngredientNames(names: string[]): Promise<Ingredient[]> {
  const cleaned = Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)));
  if (cleaned.length === 0) return [];
  const { data, error } = await supabase
    .from("ingredients")
    .select(SELECT)
    .in("name", cleaned);
  if (error) throw error;
  return (data ?? []) as Ingredient[];
}
