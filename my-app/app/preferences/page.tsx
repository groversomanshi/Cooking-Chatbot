"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { getDietaryRestrictionOptions } from "@/lib/api/recommend";
import {
  getUserRestrictions,
  setUserRestrictions,
} from "@/lib/api/userInfo";

function prettyLabel(value: string): string {
  return value
    .split(/[_-]/g)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function PreferencesPage() {
  const { user, loading: authLoading } = useAuth();

  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getDietaryRestrictionOptions(),
      user ? getUserRestrictions(user.id) : Promise.resolve<string[]>([]),
    ])
      .then(([opts, userRest]) => {
        if (cancelled) return;
        setOptions(opts);
        setSelected(new Set(userRest));
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load preferences");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  function toggle(value: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await setUserRestrictions(user.id, [...selected]);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <PageHeader title="Preferences" showBack />

      <Container maxWidth="sm" sx={{ flex: 1, py: 3 }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              Dietary restrictions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recipes that conflict with anything you select will be hidden from
              your recommendations.
            </Typography>
          </Stack>

          {!user && !authLoading ? (
            <Alert severity="info">
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2">
                  Log in to set your preferences.
                </Typography>
                <Button component={Link} href="/login" size="small">
                  Log in
                </Button>
              </Stack>
            </Alert>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : options.length === 0 ? (
            <Alert severity="info">
              No dietary restriction options were returned by the backend. Make
              sure the recommender server is running and has access to the
              database.
            </Alert>
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                {options.map((opt) => {
                  const active = selected.has(opt);
                  return (
                    <Chip
                      key={opt}
                      label={prettyLabel(opt)}
                      onClick={() => toggle(opt)}
                      color={active ? "primary" : "default"}
                      variant={active ? "filled" : "outlined"}
                      sx={{ borderRadius: 2 }}
                    />
                  );
                })}
              </Box>

              {saved && (
                <Alert severity="success" onClose={() => setSaved(false)}>
                  Preferences saved.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Container>

      {user && options.length > 0 && (
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            bgcolor: "background.paper",
            borderTop: 1,
            borderColor: "divider",
            px: 2,
            py: 2,
            pb: "calc(env(safe-area-inset-bottom) + 16px)",
          }}
        >
          <Container maxWidth="sm" disableGutters>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              variant="contained"
              size="large"
              fullWidth
              sx={{ borderRadius: 999, py: 1.5 }}
            >
              {saving
                ? "Saving…"
                : selected.size === 0
                  ? "Save (no restrictions)"
                  : `Save ${selected.size} restriction${selected.size === 1 ? "" : "s"}`}
            </Button>
          </Container>
        </Box>
      )}
    </Box>
  );
}
