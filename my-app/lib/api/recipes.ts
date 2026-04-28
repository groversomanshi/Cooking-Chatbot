import type { Recipe } from "@/types/recipe";

// TODO: replace all placeholder data below with real Supabase queries.
// Keep the function signatures stable so components don't need to change.

export async function getRecommendedRecipes(): Promise<Recipe[]> {
  return [];
}

export async function getFavoriteRecipes(): Promise<Recipe[]> {
  return [];
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  return {
    id,
    title: "Placeholder recipe",
    description: "Replace with real data from Supabase.",
    ingredients: ["1 cup placeholder", "2 tbsp example"],
    steps: ["Step one.", "Step two."],
  };
}

export async function toggleFavorite(recipeId: string, favorited: boolean): Promise<void> {
  void recipeId;
  void favorited;
}
