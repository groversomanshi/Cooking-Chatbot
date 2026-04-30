"use client";

import { useEffect, useState } from "react";
import { Alert, Container, Stack, Typography } from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
import RecipeCard from "@/components/recipes/RecipeCard";
import { getRecommendedRecipes } from "@/lib/api/recipes";
import type { Recipe } from "@/types/recipe";

export default function RecommendationsPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRecommendedRecipes()
      .then((r) => {
        if (!cancelled) setRecipes(r);
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
  }, []);

  return (
    <>
      <PageHeader title="Recommended for you" />

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : loading ? (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 6 }}
          >
            Loading…
          </Typography>
        ) : recipes.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 6 }}
          >
            Scan some ingredients to get recommendations.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </Stack>
        )}
      </Container>
    </>
  );
}
