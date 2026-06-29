"use client";

import { Alert } from "@mui/material";

export default function LoginForm() {
  return (
    <Alert severity="info">
      Email/password login is not enabled. Use Google sign-in once OAuth
      credentials are configured.
    </Alert>
  );
}
