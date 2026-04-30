/** A row from the public.ingredients reference table. */
export type Ingredient = {
  ingredientId: number;
  name: string;
  restrictions?: string[] | null;
};

/** A locally-detected item from a single camera session. Never persisted. */
export type ScannedItem = {
  /** Local-only id used for React keys. */
  id: string;
  /** Free-text label produced by the model / typed by the user. */
  name: string;
  quantity?: string;
  /**
   * If we matched the scanned name to a real row in `ingredients`, this is
   * the bigint id from the DB. Otherwise undefined (won't be sendable to pantry).
   */
  ingredientId?: number;
};
