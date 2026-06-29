import { backendFetch } from "@/lib/api/backend";
import { getIngredientsByIds } from "@/lib/api/ingredients";
import type { Recipe } from "@/types/recipe";

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
  const steps = row.instructions?.filter(Boolean) ?? [];
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
  const params = new URLSearchParams({ limit: "50" });
  const res = await backendFetch(`/recipes?${params.toString()}`);
  return ((await res.json()) as RecipeRow[]).map(mapRow);
}

export async function getRecipesByIds(ids: number[]): Promise<Recipe[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams({ ids: ids.join(",") });
  const res = await backendFetch(`/recipes?${params.toString()}`);
  const rows = ((await res.json()) as RecipeRow[]).map(mapRow);
  // Preserve the order requested by the caller.
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(String(id))).filter((r): r is Recipe => !!r);
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;
  let data: RecipeRow;
  try {
    const res = await backendFetch(`/recipes/${numId}`);
    data = (await res.json()) as RecipeRow;
  } catch (e) {
    if (e instanceof Error && e.message.includes("recipe not found")) return null;
    throw e;
  }

  const recipe = mapRow(data);

  // If the recipe doesn't have unfiltered ingredient strings, fall back to
  // resolving names from ingredient_ids.
  if (recipe.ingredients.length === 0 && (recipe.ingredientIds?.length ?? 0) > 0) {
    const rows = await getIngredientsByIds(recipe.ingredientIds ?? []);
    recipe.ingredients = rows.map((r) => r.name);
  }

  // Placeholder instructions when the dataset doesn't include them.
  if (recipe.steps.length === 0) {
    const hasIngredients = recipe.ingredients.length > 0;
    recipe.steps = [
      "Gather your ingredients and kitchen tools.",
      hasIngredients
        ? `Prep the ingredients: ${recipe.ingredients.slice(0, 6).join(", ")}${
            recipe.ingredients.length > 6 ? ", …" : ""
          }.`
        : "Prep and measure your ingredients.",
      "Cook according to your preferred method (stovetop/oven) until done.",
      "Taste, adjust seasoning, and serve.",
    ];
    recipe.description = recipe.description || "Instructions coming soon.";
    recipe.stepsPlaceholder = true;
  }

  return recipe;
}

/**
 * Favorites live in `userInfo.favorites` (bigint[]). These helpers fetch the
 * caller's saved recipes; the pantry/favorites contexts handle the writes.
 */
async function getFavoriteIds(userId: string): Promise<number[]> {
  const res = await backendFetch(`/users/${userId}/favorites`);
  const data = (await res.json()) as { favorites: number[] | null };
  return data.favorites ?? [];
}

export async function isRecipeFavorited(
  userId: string,
  recipeId: string,
): Promise<boolean> {
  const numId = Number(recipeId);
  if (!Number.isFinite(numId)) return false;
  const ids = await getFavoriteIds(userId);
  return ids.includes(numId);
}

export async function getFavoriteRecipes(userId: string): Promise<Recipe[]> {
  const ids = await getFavoriteIds(userId);
  return getRecipesByIds(ids);
}

export async function toggleFavorite(
  userId: string,
  recipeId: string,
  favorited: boolean,
): Promise<void> {
  const numId = Number(recipeId);
  if (!Number.isFinite(numId)) throw new Error(`Invalid recipe id: ${recipeId}`);

  const current = await getFavoriteIds(userId);
  const next = favorited
    ? Array.from(new Set([...current, numId]))
    : current.filter((id) => id !== numId);

  await backendFetch(`/users/${userId}/favorites`, {
    method: "PUT",
    body: JSON.stringify({ favorites: next }),
  });
}
