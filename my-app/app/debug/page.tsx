"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "@/lib/supabase/client";

type ProbeResult = {
  table: string;
  ok: boolean;
  count: number | null;
  sample: unknown;
  error: string | null;
};

// Tables we'll try to read from to see if anything is there. Add yours here.
const CANDIDATE_TABLES = ["ingredients", "recipes", "userInfo"];

export default function DebugPage() {
  const [envOk, setEnvOk] = useState<boolean | null>(null);
  const [envUrl, setEnvUrl] = useState<string>("(unset)");
  const [sessionInfo, setSessionInfo] = useState<string>("checking…");
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [customTable, setCustomTable] = useState("");
  const [running, setRunning] = useState(false);

  async function probeTable(table: string): Promise<ProbeResult> {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .limit(3);
      if (error) {
        return { table, ok: false, count: null, sample: null, error: error.message };
      }
      return {
        table,
        ok: true,
        count: count ?? data?.length ?? 0,
        sample: data ?? [],
        error: null,
      };
    } catch (e) {
      return {
        table,
        ok: false,
        count: null,
        sample: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async function runAllProbes() {
    setRunning(true);
    const results: ProbeResult[] = [];
    for (const t of CANDIDATE_TABLES) {
      // eslint-disable-next-line no-await-in-loop
      const r = await probeTable(t);
      results.push(r);
      console.log(`[supabase debug] table "${t}" →`, r);
    }
    setProbes(results);
    setRunning(false);
  }

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    setEnvUrl(url ?? "(unset)");
    setEnvOk(!!url && !!key);
    console.log("[supabase debug] env", {
      NEXT_PUBLIC_SUPABASE_URL: url,
      hasPublishableKey: !!key,
    });

    supabase.auth.getSession().then(({ data, error }) => {
      console.log("[supabase debug] getSession →", { data, error });
      if (error) {
        setSessionInfo(`error: ${error.message}`);
      } else if (data.session) {
        setSessionInfo(`logged in as ${data.session.user.email ?? data.session.user.id}`);
      } else {
        setSessionInfo("no active session (not logged in)");
      }
    });

    runAllProbes();
  }, []);

  async function probeCustom() {
    if (!customTable.trim()) return;
    const r = await probeTable(customTable.trim());
    console.log(`[supabase debug] custom table "${customTable}" →`, r);
    setProbes((prev) => [r, ...prev]);
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Supabase Debug</Typography>
        <Typography variant="body2" color="text.secondary">
          Open DevTools console — every probe is logged there too.
        </Typography>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Environment
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {envUrl}
            </Typography>
            <Typography variant="body2">
              <strong>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:</strong>{" "}
              {envOk ? "present" : "MISSING"}
            </Typography>
            {envOk === false && (
              <Alert severity="error">
                Env vars not loaded. Make sure <code>my-app/.env.local</code> exists and
                you restarted <code>npm run dev</code>.
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Auth session
          </Typography>
          <Typography variant="body2">{sessionInfo}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6">Table probes</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={runAllProbes}
              disabled={running}
            >
              {running ? "Probing…" : "Re-run probes"}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              label="Try another table"
              value={customTable}
              onChange={(e) => setCustomTable(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={probeCustom}>
              Probe
            </Button>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            {probes.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No probes yet.
              </Typography>
            )}
            {probes.map((p, i) => (
              <Box key={`${p.table}-${i}`}>
                <Typography variant="subtitle2">
                  <code>{p.table}</code>{" "}
                  {p.ok ? (
                    <span style={{ color: "green" }}>OK ({p.count} rows)</span>
                  ) : (
                    <span style={{ color: "crimson" }}>error</span>
                  )}
                </Typography>
                {p.error && (
                  <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                    {p.error}
                  </Typography>
                )}
                {p.ok && Array.isArray(p.sample) && p.sample.length > 0 && (
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
                    {JSON.stringify(p.sample, null, 2)}
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
