import { backendFetch } from "@/lib/api/backend";

export type RecipeRecommendation = {
  id: number;
  name: string;
  website: string | null;
  matchPercent: number;
  matchedIngredientCount: number;
  totalIngredientCount: number;
};

export async function getRecommendationsForUser(
  userId: string,
  limit = 50,
): Promise<RecipeRecommendation[]> {
  const params = new URLSearchParams({ userId, limit: String(limit) });
  const res = await backendFetch(`/recommend?${params.toString()}`);
  return (await res.json()) as RecipeRecommendation[];
}

export async function getDietaryRestrictionOptions(): Promise<string[]> {
  const res = await backendFetch(`/restrictions`);
  const body = (await res.json()) as { options: string[] };
  return body.options;
}
