"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Divider, Stack, Typography } from "@mui/material";
import { signIn } from "next-auth/react";

export default function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  const [pending, setPending] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((providers) => setConfigured(!!providers.google))
      .catch(() => setConfigured(false));
  }, []);

  async function handleClick() {
    setError(null);
    if (!configured) {
      setError("Google OAuth is not configured yet.");
      return;
    }
    setPending(true);
    try {
      await signIn("google", { callbackUrl: "/hub" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      setPending(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Divider sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          or
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Stack>

      <Button
        onClick={handleClick}
        disabled={pending || configured === null}
        variant="outlined"
        size="large"
        fullWidth
        startIcon={
          // Inline Google "G" mark — avoids an external request.
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5c-7.5 0-13.9 4.2-17.7 10.2z"
            />
            <path
              fill="#4CAF50"
              d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-5.1C29 35 26.6 35.8 24 35.8c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.9 39.1 16.4 43.5 24 43.5z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.4 5.7l6 5.1c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z"
            />
          </svg>
        }
        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500 }}
      >
        {pending ? "Redirecting..." : label}
      </Button>

      {configured === false && (
        <Alert severity="info">
          Google OAuth is not configured yet. Add <code>AUTH_GOOGLE_ID</code> and{" "}
          <code>AUTH_GOOGLE_SECRET</code> to <code>my-app/.env</code>.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
