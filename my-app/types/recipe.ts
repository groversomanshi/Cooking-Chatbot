/**
 * Mirrors public.recipes:
 *   id bigint, name text, ingredient_ids bigint[],
 *   instructions text[], unfiltered_ingredients text[],
 *   website text, dietary_restrictions dietary_restriction[]
 *
 * `id` is stringified for use in URLs / React keys; we convert at the API boundary.
 */
export type Recipe = {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  imageUrl?: string;
  website?: string | null;
  ingredientIds?: number[];
  dietaryRestrictions?: string[] | null;
};
