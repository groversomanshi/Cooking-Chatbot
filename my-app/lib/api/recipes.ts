import { supabase } from "@/lib/supabase/client";
import type { Recipe } from "@/types/recipe";

const SELECT =
  "id, name, ingredient_ids, instructions, unfiltered_ingredients, website, dietary_restrictions";

type RecipeRow = {
  id: number;
  name: string;
  ingredient_ids: number[] | null;
  instructions: string[] | null;
  unfiltered_ingredients: string[] | null;
  website: string | null;
  dietary_restrictions: string[] | null;
};

function mapRow(row: RecipeRow): Recipe {
  const steps = row.instructions ?? [];
  return {
    id: String(row.id),
    title: row.name,
    description: steps[0] ?? "",
    ingredients: row.unfiltered_ingredients ?? [],
    steps,
    website: row.website,
    ingredientIds: row.ingredient_ids ?? [],
    dietaryRestrictions: row.dietary_restrictions ?? [],
  };
}

export async function getRecommendedRecipes(): Promise<Recipe[]> {
  // TODO: filter by the user's pantry ingredient_ids once we have a server route.
  const { data, error } = await supabase
    .from("recipes")
    .select(SELECT)
    .order("id", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data as RecipeRow[]).map(mapRow);
}

export async function getRecipesByIds(ids: number[]): Promise<Recipe[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("recipes")
    .select(SELECT)
    .in("id", ids);
  if (error) throw error;
  const rows = (data as RecipeRow[]).map(mapRow);
  // Preserve the order requested by the caller.
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(String(id))).filter((r): r is Recipe => !!r);
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;
  const { data, error } = await supabase
    .from("recipes")
    .select(SELECT)
    .eq("id", numId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as RecipeRow) : null;
}

/**
 * Favorites live in `userInfo.favorites` (bigint[]). These helpers fetch the
 * caller's saved recipes; the pantry/favorites contexts handle the writes.
 */
export async function getFavoriteRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("userInfo")
    .select("favorites")
    .eq("userId", userId)
    .maybeSingle();
  if (error) throw error;
  const ids = (data?.favorites as number[] | null) ?? [];
  return getRecipesByIds(ids);
}

export async function toggleFavorite(
  userId: string,
  recipeId: string,
  favorited: boolean,
): Promise<void> {
  const numId = Number(recipeId);
  if (!Number.isFinite(numId)) throw new Error(`Invalid recipe id: ${recipeId}`);

  const { data, error } = await supabase
    .from("userInfo")
    .select("favorites")
    .eq("userId", userId)
    .maybeSingle();
  if (error) throw error;

  const current = (data?.favorites as number[] | null) ?? [];
  const next = favorited
    ? Array.from(new Set([...current, numId]))
    : current.filter((id) => id !== numId);

  const { error: writeErr } = await supabase
    .from("userInfo")
    .upsert({ userId, favorites: next }, { onConflict: "userId" });
  if (writeErr) throw writeErr;
}
