import type { Recipe } from "@/types/recipe";

// TODO: replace placeholder data with real Supabase queries.
// Keep these function signatures stable so components don't need to change.

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: "tomato-onion-pasta",
    title: "Tomato & onion pasta",
    description: "A 15-minute weeknight pasta using just what's in the fridge.",
    imageUrl:
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=75&auto=format&fit=crop",
    ingredients: [
      "200g spaghetti",
      "2 ripe tomatoes, diced",
      "1 onion, finely chopped",
      "2 cloves garlic, minced",
      "Olive oil, salt, pepper",
      "Parmesan to finish",
    ],
    steps: [
      "Bring a pot of salted water to a boil and cook the spaghetti.",
      "Sauté onion in olive oil until soft, then add garlic.",
      "Add tomatoes and cook until they break down into a sauce.",
      "Toss the pasta in the sauce, season, and finish with parmesan.",
    ],
  },
  {
    id: "veggie-stir-fry",
    title: "Quick veggie stir fry",
    description: "Crisp vegetables, soy, and garlic over rice. Done in 20.",
    imageUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=75&auto=format&fit=crop",
    ingredients: [
      "2 cups mixed vegetables",
      "2 cloves garlic",
      "1 tbsp soy sauce",
      "1 tsp sesame oil",
      "Cooked rice, to serve",
    ],
    steps: [
      "Heat a wok over high heat with a splash of oil.",
      "Add garlic, then vegetables, and stir fry for 4-5 minutes.",
      "Finish with soy sauce and sesame oil. Serve over rice.",
    ],
  },
  {
    id: "fridge-frittata",
    title: "Fridge-clean-out frittata",
    description: "Whatever leftover veg you have, plus eggs. Always works.",
    imageUrl:
      "https://images.unsplash.com/photo-1565299543923-37dd37887442?w=800&q=75&auto=format&fit=crop",
    ingredients: [
      "6 eggs",
      "1 cup leftover vegetables",
      "1/4 cup cheese, grated",
      "Salt, pepper, butter",
    ],
    steps: [
      "Heat butter in an oven-safe skillet over medium heat.",
      "Add the leftover vegetables and warm through.",
      "Whisk eggs with salt, pepper, and cheese; pour over veg.",
      "Cook 2 min, then finish under the broiler until set and golden.",
    ],
  },
];

export async function getRecommendedRecipes(): Promise<Recipe[]> {
  return SAMPLE_RECIPES;
}

export async function getFavoriteRecipes(): Promise<Recipe[]> {
  return SAMPLE_RECIPES.slice(0, 1);
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  return SAMPLE_RECIPES.find((r) => r.id === id) ?? SAMPLE_RECIPES[0];
}

export async function toggleFavorite(recipeId: string, favorited: boolean): Promise<void> {
  void recipeId;
  void favorited;
}
