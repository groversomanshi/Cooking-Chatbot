"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useCamera } from "@/hooks/useCamera";
import { useAuth } from "@/hooks/useAuth";
import { usePantry } from "@/context/PantryContext";
import { detectIngredient } from "@/lib/api/detect";

const POLL_INTERVAL_MS = 2000;

type Detection = { ingredientId: number; name: string; score: number };

export default function CameraView() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { videoRef, captureFrame, ready, error: cameraError } = useCamera();
  const { addIds } = usePantry();

  const [detection, setDetection] = useState<Detection | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const inFlight = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!ready || !user || detection) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    async function tick() {
      if (cancelled || inFlight.current) {
        schedule();
        return;
      }
      const frame = await captureFrame();
      if (!frame || cancelled) {
        schedule();
        return;
      }
      inFlight.current = true;
      setScanning(true);
      try {
        const res = await detectIngredient(frame);
        if (cancelled) return;
        if (res.detected) {
          setDetection({
            ingredientId: res.ingredientId,
            name: res.name,
            score: res.score,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Detection failed");
        }
      } finally {
        inFlight.current = false;
        if (!cancelled) setScanning(false);
        schedule();
      }
    }

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ready, user, detection, captureFrame]);

  async function handleYes() {
    if (!detection) return;
    setSaving(true);
    setError(null);
    try {
      await addIds([detection.ingredientId]);
      setLastAdded(detection.name);
      setDetection(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  function handleNo() {
    setDetection(null);
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

        {!ready && !cameraError && (
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

        {scanning && !detection && (
          <Box
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              bgcolor: "rgba(255,255,255,0.85)",
              borderRadius: 999,
              px: 1.5,
              py: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              Scanning…
            </Typography>
          </Box>
        )}

        {detection && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              p: 2,
            }}
          >
            <Box
              sx={{
                bgcolor: "background.paper",
                borderRadius: 4,
                p: 4,
                textAlign: "center",
                maxWidth: 360,
                width: "100%",
                boxShadow: 6,
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: "0.1em" }}
              >
                Ingredient detected
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 600 }}>
                Is this {detection.name}?
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 0.5 }}
              >
                {(detection.score * 100).toFixed(0)}% confidence
              </Typography>

              <Stack
                direction="row"
                spacing={1.5}
                sx={{ mt: 3, justifyContent: "center" }}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleNo}
                  disabled={saving}
                >
                  No
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleYes}
                  disabled={saving}
                >
                  {saving ? "Adding…" : "Yes, add it"}
                </Button>
              </Stack>
            </Box>
          </Box>
        )}
      </Box>

      {cameraError && <Alert severity="error">{cameraError}</Alert>}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {lastAdded && !detection && (
        <Alert severity="success" onClose={() => setLastAdded(null)}>
          Added <strong>{lastAdded}</strong> to your pantry.
        </Alert>
      )}
    </Stack>
  );
}
