"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Stack, TextField } from "@mui/material";
import { signUp } from "@/lib/api/auth";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const result = await signUp(email, password);
      if (result.hasSession) {
        router.push("/hub");
      } else if (result.needsEmailConfirmation) {
        setInfo(
          `We sent a confirmation link to ${email}. Click it, then come back and log in.`,
        );
      } else {
        setError("Signup didn't return a user. Check the Supabase auth settings.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          fullWidth
        />
        <TextField
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          slotProps={{ htmlInput: { minLength: 6 } }}
          required
          fullWidth
          helperText="At least 6 characters"
        />

        {error && <Alert severity="error">{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={pending}
          fullWidth
        >
          {pending ? "Creating account…" : "Sign up"}
        </Button>
      </Stack>
    </Box>
  );
}
