import { supabase } from "@/lib/supabase/client";

/** Read the dietary restrictions saved on the user's userInfo row. */
export async function getUserRestrictions(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("userInfo")
    .select("restrictions")
    .eq("userId", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.restrictions as string[] | null) ?? [];
}

/** Replace the user's dietary restrictions with the given list. Upserts the row. */
export async function setUserRestrictions(
  userId: string,
  restrictions: string[],
): Promise<void> {
  const { error } = await supabase
    .from("userInfo")
    .upsert(
      { userId, restrictions },
      { onConflict: "userId" },
    );
  if (error) throw error;
}
