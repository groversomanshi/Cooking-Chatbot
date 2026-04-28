"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useCamera } from "@/hooks/useCamera";
import { useScannedItems } from "@/hooks/useScannedItems";

export default function CameraView() {
  const router = useRouter();
  const { videoRef, captureFrame, ready } = useCamera();
  const { addItems } = useScannedItems();

  async function handleCapture() {
    const frame = await captureFrame();
    if (!frame) return;

    const detected = [
      { id: crypto.randomUUID(), name: "Tomato" },
      { id: crypto.randomUUID(), name: "Onion" },
    ];

    addItems(detected);
    router.push("/scanned");
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

      <Button
        onClick={handleCapture}
        disabled={!ready}
        variant="contained"
        size="large"
        sx={{ borderRadius: 999, py: 1.75 }}
      >
        Capture
      </Button>
    </Stack>
  );
}
