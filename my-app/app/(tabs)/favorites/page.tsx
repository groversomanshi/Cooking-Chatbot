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
  const [favorites, setFavorites] = useState<{
    userId: string;
    recipes: Recipe[];
  } | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    getFavoriteRecipes(user.id)
      .then((r) => {
        if (!cancelled) setFavorites({ userId: user.id, recipes: r });
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const currentFavorites = favorites?.userId === user?.id ? favorites : null;
  const recipes = currentFavorites?.recipes ?? [];
  const loading = authLoading || (!!user && !currentFavorites);

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
