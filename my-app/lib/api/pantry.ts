import { supabase } from "@/lib/supabase/client";
import { getIngredientsByIds } from "@/lib/api/ingredients";
import type { Ingredient } from "@/types/ingredient";

/**
 * The pantry lives in `userInfo.ingredients` (bigint[]) keyed by `userId`.
 * We read the array, hydrate names from the `ingredients` table, and write
 * the whole array back on changes. Simple and fine for small pantries.
 */

type UserInfoRow = {
  userId: string;
  ingredients: number[] | null;
};

/** Make sure a userInfo row exists for this user (returns the current row). */
async function ensureUserInfo(userId: string): Promise<UserInfoRow> {
  const { data, error } = await supabase
    .from("userInfo")
    .select(`"userId", ingredients`)
    .eq("userId", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as UserInfoRow;

  const { data: inserted, error: insertErr } = await supabase
    .from("userInfo")
    .insert({ userId, ingredients: [] })
    .select(`"userId", ingredients`)
    .single();
  if (insertErr) throw insertErr;
  return inserted as UserInfoRow;
}

export async function getPantryIngredientIds(userId: string): Promise<number[]> {
  const row = await ensureUserInfo(userId);
  return row.ingredients ?? [];
}

export async function getPantry(userId: string): Promise<Ingredient[]> {
  const ids = await getPantryIngredientIds(userId);
  if (ids.length === 0) return [];
  const rows = await getIngredientsByIds(ids);
  // Preserve the order stored on userInfo so the UI is stable.
  const byId = new Map(rows.map((r) => [r.ingredientId, r]));
  return ids.map((id) => byId.get(id)).filter((x): x is Ingredient => !!x);
}

async function writePantry(userId: string, ids: number[]): Promise<void> {
  const { error } = await supabase
    .from("userInfo")
    .update({ ingredients: ids })
    .eq("userId", userId);
  if (error) throw error;
}

export async function addIngredientsToPantry(
  userId: string,
  newIds: number[],
): Promise<number[]> {
  if (newIds.length === 0) return getPantryIngredientIds(userId);
  const current = await getPantryIngredientIds(userId);
  const merged = Array.from(new Set([...current, ...newIds]));
  await writePantry(userId, merged);
  return merged;
}

export async function removeIngredientFromPantry(
  userId: string,
  ingredientId: number,
): Promise<number[]> {
  const current = await getPantryIngredientIds(userId);
  const next = current.filter((id) => id !== ingredientId);
  await writePantry(userId, next);
  return next;
}

export async function clearPantry(userId: string): Promise<void> {
  await writePantry(userId, []);
}
