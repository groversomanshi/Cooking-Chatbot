"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import PageHeader from "@/components/layout/PageHeader";
import RecommendationCard from "@/components/recipes/RecommendationCard";
import {
  getRecommendationsForUser,
  type RecipeRecommendation,
} from "@/lib/api/recommend";
import { useAuth } from "@/hooks/useAuth";

export default function RecommendationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [recs, setRecs] = useState<RecipeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRecommendationsForUser(user.id, 50)
      .then((data) => {
        if (!cancelled) setRecs(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load recipes");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return (
    <>
      <PageHeader
        title="Recommended for you"
        action={
          <Button
            component={Link}
            href="/preferences"
            size="small"
            startIcon={<TuneIcon />}
          >
            Preferences
          </Button>
        }
      />

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {!user && !authLoading ? (
          <Alert severity="info">
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2">
                Log in to see recipes that match your pantry.
              </Typography>
              <Button component={Link} href="/login" size="small">
                Log in
              </Button>
            </Stack>
          </Alert>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : loading ? (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 6 }}
          >
            Finding recipes…
          </Typography>
        ) : recs.length === 0 ? (
          <Stack spacing={2} sx={{ alignItems: "center", py: 6 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              No matches yet.
              <br />
              Add ingredients to your pantry, or relax your dietary preferences.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button component={Link} href="/pantry" variant="outlined">
                Open pantry
              </Button>
              <Button
                component={Link}
                href="/preferences"
                variant="outlined"
                startIcon={<TuneIcon />}
              >
                Preferences
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {recs.map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
          </Stack>
        )}
      </Container>
    </>
  );
}
