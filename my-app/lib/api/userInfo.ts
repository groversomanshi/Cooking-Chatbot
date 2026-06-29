import { backendFetch } from "@/lib/api/backend";

/** Read the dietary restrictions saved on the user's userInfo row. */
export async function getUserRestrictions(userId: string): Promise<string[]> {
  const res = await backendFetch(`/users/${userId}/restrictions`);
  const data = (await res.json()) as { restrictions: string[] | null };
  return data.restrictions ?? [];
}

/** Replace the user's dietary restrictions with the given list. Upserts the row. */
export async function setUserRestrictions(
  userId: string,
  restrictions: string[],
): Promise<void> {
  await backendFetch(`/users/${userId}/restrictions`, {
    method: "PUT",
    body: JSON.stringify({ restrictions }),
  });
}
