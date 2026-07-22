export type DetectResult =
  | { detected: true; ingredientId: number; name: string; score: number }
  | { detected: false; score?: number };

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000";

const ENDPOINT =
  process.env.NEXT_PUBLIC_DETECT_URL ?? `${BACKEND.replace(/\/$/, "")}/detect`;

const FETCH_MS = 120_000;

export async function detectIngredient(image: Blob): Promise<DetectResult> {
  const fd = new FormData();
  fd.append("image", image, "frame.jpg");

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      body: fd,
      signal: AbortSignal.timeout(FETCH_MS),
    });
  } catch (e) {
    throw new Error(
      `Couldn't reach detection server at ${ENDPOINT}. Is it running? (${
        e instanceof Error ? e.message : String(e)
      })`,
    );
  }

  if (!res.ok) {
    let msg = `detect failed: HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // not JSON, keep default
    }
    throw new Error(msg);
  }

  return (await res.json()) as DetectResult;
}
