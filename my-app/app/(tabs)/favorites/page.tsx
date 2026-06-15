"use client";

import { useEffect, useState } from "react";
import { Container, Stack, Typography } from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
import RecipeCard from "@/components/recipes/RecipeCard";
import { getFavoriteRecipes } from "@/lib/api/recipes";
import { useAuth } from "@/hooks/useAuth";
import type { Recipe } from "@/types/recipe";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getFavoriteRecipes(user.id)
      .then((r) => {
        if (!cancelled) setRecipes(r);
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
      <PageHeader title="Favorites" />

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {!user && !authLoading ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
            Log in to see your saved recipes.
          </Typography>
        ) : loading ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
            Loading…
          </Typography>
        ) : recipes.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 6 }}
          >
            No favorites yet. Save recipes from the recommendations page.
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
