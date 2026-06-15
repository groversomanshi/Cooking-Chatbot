export type RecipeRecommendation = {
  id: number;
  name: string;
  website: string | null;
  matchPercent: number;
  matchedIngredientCount: number;
  totalIngredientCount: number;
};

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000";

const FETCH_MS = 45_000;

async function backendFetch(path: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND}${path}`, {
      signal: AbortSignal.timeout(FETCH_MS),
    });
  } catch (e) {
    throw new Error(
      `Couldn't reach backend at ${BACKEND}. Is it running? (${
        e instanceof Error ? e.message : String(e)
      })`,
    );
  }
  if (!res.ok) {
    let msg = `${path} failed: HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // not JSON
    }
    throw new Error(msg);
  }
  return res;
}

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
