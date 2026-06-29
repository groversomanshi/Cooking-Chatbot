const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000";

const FETCH_MS = 45_000;

export async function backendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
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
