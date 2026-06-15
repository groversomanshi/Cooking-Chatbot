"use client";

import Link from "next/link";
import { Button, Typography, Container, Stack } from "@mui/material";

export default function OnboardingPage() {
  return (
    <Container maxWidth="sm">
      <Stack
        spacing={6}
        sx={{
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          py: 8,
        }}
      >
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="h1">Cooking Chatbot</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 360 }}>
            Scan your fridge, get recipes you&apos;ll actually want to cook.
          </Typography>
        </Stack>

        <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 320 }}>
          <Button
            component={Link}
            href="/login"
            variant="contained"
            color="primary"
            size="large"
          >
            Log in
          </Button>
          <Button
            component={Link}
            href="/signup"
            variant="outlined"
            color="primary"
            size="large"
          >
            Create an account
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
