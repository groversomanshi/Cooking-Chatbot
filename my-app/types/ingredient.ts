/** A row from the public.ingredients reference table. */
export type Ingredient = {
  ingredientId: number;
  name: string;
  restrictions?: string[] | null;
};
