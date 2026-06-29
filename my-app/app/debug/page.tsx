"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { backendFetch } from "@/lib/api/backend";

type ProbeResult = {
  endpoint: string;
  ok: boolean;
  sample: unknown;
  error: string | null;
};

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5000";

const PROBES = ["/health", "/ingredients?limit=3", "/recipes?limit=3", "/restrictions"];

async function probeEndpoint(endpoint: string): Promise<ProbeResult> {
  try {
    const res = await backendFetch(endpoint);
    return {
      endpoint,
      ok: true,
      sample: await res.json(),
      error: null,
    };
  } catch (e) {
    return {
      endpoint,
      ok: false,
      sample: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export default function DebugPage() {
  const [backendUrl] = useState(BACKEND);
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [running, setRunning] = useState(false);

  const runAllProbes = useCallback(async () => {
    setRunning(true);
    const results = await Promise.all(PROBES.map((endpoint) => probeEndpoint(endpoint)));
    results.forEach((result) => {
      console.log(`[backend debug] ${result.endpoint}`, result);
    });
    setProbes(results);
    setRunning(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((providers) => setGoogleConfigured(!!providers.google))
      .catch(() => setGoogleConfigured(false));

    queueMicrotask(() => {
      void runAllProbes();
    });
  }, [runAllProbes]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Backend Debug</Typography>
        <Typography variant="body2" color="text.secondary">
          Database probes go through the Flask backend at <code>{backendUrl}</code>.
          Auth probes go through Auth.js.
        </Typography>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Backend
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>NEXT_PUBLIC_BACKEND_URL:</strong> {backendUrl}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={runAllProbes}
              disabled={running}
              sx={{ alignSelf: "flex-start" }}
            >
              {running ? "Probing..." : "Re-run probes"}
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Auth
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Google OAuth:{" "}
            {googleConfigured === null
              ? "checking..."
              : googleConfigured
                ? "configured"
                : "not configured"}
          </Typography>
          {googleConfigured === false && (
            <Alert severity="warning">
              Add <code>AUTH_GOOGLE_ID</code> and <code>AUTH_GOOGLE_SECRET</code>{" "}
              to <code>my-app/.env.local</code> to enable Google sign-in.
            </Alert>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Backend Probes
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            {probes.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No probes yet.
              </Typography>
            )}
            {probes.map((probe) => (
              <Box key={probe.endpoint}>
                <Typography variant="subtitle2">
                  <code>{probe.endpoint}</code>{" "}
                  {probe.ok ? (
                    <span style={{ color: "green" }}>OK</span>
                  ) : (
                    <span style={{ color: "crimson" }}>error</span>
                  )}
                </Typography>
                {probe.error && (
                  <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                    {probe.error}
                  </Typography>
                )}
                {probe.ok && (
                  <Box
                    component="pre"
                    sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: "grey.100",
                      borderRadius: 1,
                      fontSize: 12,
                      overflow: "auto",
                      maxHeight: 240,
                    }}
                  >
                    {JSON.stringify(probe.sample, null, 2)}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
