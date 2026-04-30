"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useCamera } from "@/hooks/useCamera";
import { useScannedItems } from "@/context/ScannedContext";
import { resolveIngredientNames } from "@/lib/api/ingredients";
import type { ScannedItem } from "@/types/ingredient";

// TODO: replace with real model output. For now this stub asks the DB whether
// these names exist so the resulting ScannedItem has a real ingredientId.
const STUB_DETECTED_NAMES = ["tomato", "onion"];

export default function CameraView() {
  const router = useRouter();
  const { videoRef, captureFrame, ready } = useCamera();
  const { addItems } = useScannedItems();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCapture() {
    setError(null);
    setPending(true);
    try {
      const frame = await captureFrame();
      if (!frame) return;

      const matched = await resolveIngredientNames(STUB_DETECTED_NAMES);
      const matchedByName = new Map(matched.map((m) => [m.name.toLowerCase(), m]));

      const detected: ScannedItem[] = STUB_DETECTED_NAMES.map((name) => {
        const hit = matchedByName.get(name.toLowerCase());
        return {
          id: crypto.randomUUID(),
          name: hit?.name ?? name,
          ingredientId: hit?.ingredientId,
        };
      });

      addItems(detected);
      router.push("/scanned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          position: "relative",
          aspectRatio: "3 / 4",
          width: "100%",
          overflow: "hidden",
          borderRadius: 3,
          bgcolor: "grey.900",
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          playsInline
          muted
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {!ready && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="grey.400">
              Requesting camera…
            </Typography>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Button
        onClick={handleCapture}
        disabled={!ready || pending}
        variant="contained"
        size="large"
        sx={{ borderRadius: 999, py: 1.75 }}
      >
        {pending ? "Processing…" : "Capture"}
      </Button>
    </Stack>
  );
}
